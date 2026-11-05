import { createRemoteJWKSet, jwtVerify } from 'jose';

const getProjectId = (env) => env.FIREBASE_PROJECT_ID || 'chatting-afe71';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400'
};

function withCors(response) {
  const headers = new Headers(response.headers);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (url.pathname === '/notify' && request.method === 'POST') {
      return withCors(await handleNotify(request, env, ctx));
    }

    if (url.pathname === '/sendNotification' && request.method === 'POST') {
      return withCors(await handleSendNotification(request, env));
    }

    if (url.pathname === '/chat' && request.method === 'POST') {
      return withCors(await handleAiChatRequest(request, env));
    }

    return withCors(new Response('Not Found', { status: 404 }));
  },

  async scheduled(event, env, ctx) {
    console.log('--- Cron Trigger Started ---');
    await processPendingTasks(env);
  }
};

async function handleAiChatRequest(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCors(new Response(JSON.stringify({ status: 'error', message: 'Unauthorized: Missing token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    const idToken = authHeader.split('Bearer ')[1];
    const payload = await verifyFirebaseToken(idToken, env);
    if (!payload) {
      return withCors(new Response(JSON.stringify({ status: 'error', message: 'Forbidden: Invalid token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    const body = await request.json();
    const { prompt, history = [], imageUrl = null } = body;

    if (!prompt && !imageUrl) {
      return withCors(new Response(JSON.stringify({ status: 'error', message: 'Missing required prompt or image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    const systemPrompt = `You are a helpful, warm, and highly intelligent AI Assistant in a chat application.
You fluently support Bangla and English conversations.
You assist users with general knowledge, education, mathematics, programming/coding, translation, writing, and image analysis.
Answer clearly, concisely, and accurately.`;

    let replyText = '';

    if (env.OPENAI_API_KEY) {
      console.log('Direct Chat: Using OpenAI gpt-4o-mini...');
      try {
        const openAiMessages = [
          { role: 'system', content: systemPrompt }
        ];

        if (Array.isArray(history)) {
          history.forEach(item => {
            if (item.role && item.content) {
              openAiMessages.push({ role: item.role, content: item.content });
            }
          });
        }

        if (imageUrl) {
          openAiMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: prompt || 'Describe and analyze this image in detail.' },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          });
        } else {
          openAiMessages.push({ role: 'user', content: prompt });
        }

        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: openAiMessages
          })
        });

        const openAiData = await openAiRes.json();
        if (openAiRes.ok && openAiData.choices?.[0]?.message?.content) {
          replyText = openAiData.choices[0].message.content;
        } else {
          console.error('OpenAI Direct Chat Error:', JSON.stringify(openAiData));
          throw new Error('OpenAI API request failed');
        }
      } catch (e) {
        console.error('OpenAI Chat error, falling back to Workers AI:', e.message);
        replyText = await runWorkersAiChat(env, systemPrompt, history, prompt);
      }
    } else {
      console.log('Direct Chat: OPENAI_API_KEY unconfigured, using Workers AI...');
      replyText = await runWorkersAiChat(env, systemPrompt, history, prompt);
    }

    return withCors(new Response(JSON.stringify({ status: 'success', response: replyText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));

  } catch (error) {
    console.error('handleAiChatRequest Error:', error.message);
    return withCors(new Response(JSON.stringify({ status: 'error', message: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }));
  }
}


function extractWorkersAiText(aiResponse) {
  if (!aiResponse) return '';

const directText = [
  aiResponse.choices?.[0]?.message?.content,
  aiResponse.result?.choices?.[0]?.message?.content,
  aiResponse.response,
  aiResponse.text,
  aiResponse.output_text,
  aiResponse.result?.response,
  aiResponse.result?.text,
  aiResponse.result?.output_text
];

  for (const value of directText) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const output = aiResponse.output || aiResponse.result?.output;

  if (Array.isArray(output)) {
    const parts = [];

    for (const item of output) {
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (
            (content.type === 'output_text' || content.type === 'text') &&
            typeof content.text === 'string'
          ) {
            parts.push(content.text);
          }
        }
      } else if (
        item.type === 'output_text' &&
        typeof item.text === 'string'
      ) {
        parts.push(item.text);
      }
    }

    if (parts.length) return parts.join('\n').trim();
  }

  return '';
}

async function runWorkersAiChat(env, systemPrompt, history, prompt) {
  const formattedMessages = [
    { role: 'system', content: systemPrompt }
  ];

  if (Array.isArray(history)) {
    history.forEach(item => {
      if (item.role && item.content) {
        formattedMessages.push({ role: item.role, content: item.content });
      }
    });
  }

  formattedMessages.push({ role: 'user', content: prompt || 'Hello' });

  // Use supported Cloudflare Workers AI model: @cf/openai/gpt-oss-120b
  const aiResponse = await env.AI.run('@cf/openai/gpt-oss-120b', {
    messages: formattedMessages
  });
console.log('Workers AI response keys:', Object.keys(aiResponse || {}));
console.log('Workers AI response structure:', JSON.stringify(aiResponse).slice(0, 2000));

return extractWorkersAiText(aiResponse);
}

async function handleNotify(request, env, ctx) {
  try {
    const deadline = Date.now() + 8000;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Notify: No auth header');
      return new Response('Unauthorized', { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const payload = await verifyFirebaseToken(idToken, env);
    if (!payload) {
      console.log('Notify: Token verification failed');
      return new Response('Invalid Token', { status: 403 });
    }

    const senderId = payload.sub;
    const body = await request.json();
    const { chatId, messageId, recipientId } = body;

    console.log(`Notify: Request received from ${senderId} for chat ${chatId}`);

    if (!chatId || !messageId || !recipientId) {
      return new Response('Missing parameters', { status: 400 });
    }

    // Verify sender & recipient belong to chat ID (lexicographical user pair userId1_userId2)
    const participants = chatId.split('_');
    if (!participants.includes(senderId) || !participants.includes(recipientId)) {
      console.log('Notify: Forbidden - Sender or recipient not in chat participants');
      return new Response('Forbidden: Not a participant', { status: 403 });
    }

    const accessToken = await getFirestoreAccessToken(env);

    // Only the receiving user's AI setting can trigger an AI reply.
    const recipientAiSettings = await firestoreGet(
      `chats/${chatId}/aiSettings/${recipientId}`,
      accessToken,
      env
    );

    if (!recipientAiSettings || !recipientAiSettings.enabled) {
      console.log(`Notify: Recipient AI is disabled for ${recipientId}`);
      return new Response('Recipient AI Disabled', { status: 200 });
    }

    const taskId = `${chatId}_${messageId}`;

    // Update only these fields; preserve the recipient's other AI settings.
    await firestoreUpdate(
      `chats/${chatId}/aiSettings/${recipientId}`,
      {
        enabled: true,
        state: 'WAITING',
        lastIncomingMessageId: messageId
      },
      accessToken,
      env
    );

    // Save the task with an 8-second scheduled time.
    await firestoreSet(
      `aiPendingTasks/${taskId}`,
      {
        chatId,
        userId: recipientId,
        messageId,
        scheduledTime: new Date(deadline).toISOString(),
        timerManaged: true,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      },
      accessToken,
      env
    );

    // Schedule the exact 8-second timer through the Durable Object.
    const timerId = env.CHAT_REPLY_TIMER.idFromName(`${chatId}_${recipientId}`);
    const timerStub = env.CHAT_REPLY_TIMER.get(timerId);

    const timerResponse = await timerStub.fetch(
      'https://chat-reply-timer/schedule',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          chatId,
          userId: recipientId,
          messageId,
          deadline
        })
      }
    );

    if (!timerResponse.ok) {
      console.error('Notify: Durable Object scheduling failed:', timerResponse.status);

      await updateTaskStatus(taskId, 'CANCELLED', accessToken, env);
      await firestoreUpdate(
        `chats/${chatId}/aiSettings/${recipientId}`,
        { state: 'ERROR' },
        accessToken,
        env
      );

      return new Response('Timer scheduling failed', { status: 503 });
    }

    console.log(`Notify: Task ${taskId} scheduled for recipient ${recipientId} after 8 seconds`);

    return new Response('Task scheduled', { status: 200 });

  } catch (error) {
    console.error('Notify Error:', error.message);
    return new Response(JSON.stringify({ status: 'error', message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleSendNotification(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ status: 'error', message: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const payload = await verifyFirebaseToken(idToken, env);
    if (!payload) {
      return new Response(JSON.stringify({ status: 'error', message: 'Forbidden: Token verification failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const senderId = payload.sub;
    const body = await request.json();
    const { chatId, recipientId, title, message } = body;

    if (!chatId || !recipientId || !title || !message) {
      return new Response(JSON.stringify({ status: 'error', message: 'Missing parameters: chatId, recipientId, title, or message' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const participants = chatId.split('_');
    if (!participants.includes(senderId)) {
      return new Response(JSON.stringify({ status: 'error', message: 'Forbidden: Sender is not a participant in this chat' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const accessToken = await getFirestoreAccessToken(env);

    // Get recipient's FCM token
    const recipientDoc = await firestoreGet(`users/${recipientId}`, accessToken, env);
    const fcmToken = recipientDoc?.fcmToken;

    if (!fcmToken) {
      console.log(`Recipient ${recipientId} has no fcmToken in Firestore`);
      return new Response(JSON.stringify({ status: 'error', message: 'Recipient has no FCM token in Firestore' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get sender's name
    const senderDoc = await firestoreGet(`users/${senderId}`, accessToken, env);
    const senderName = senderDoc?.displayName || 'Someone';
    const projectId = getProjectId(env);

    // Send FCM via HTTP v1 API
    const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: {
            title: senderName,
            body: message
          },
          data: {
            title: title,
            body: message,
            chatId: chatId,
            senderId: senderId,
            senderName: senderName
          },
          android: {
            priority: 'high',
            notification: {
              channel_id: 'chat_messages',
              sound: 'default'
            }
          }
        }
      })
    });

    const fcmResult = await fcmResponse.json();
    console.log('FCM REST API HTTP Status:', fcmResponse.status);

    if (!fcmResponse.ok) {
      console.error('FCM Send Error Response:', JSON.stringify(fcmResult));
      return new Response(JSON.stringify({ status: 'fcm_error', code: fcmResponse.status, error: fcmResult }), {
        status: fcmResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ status: 'success', messageId: fcmResult.name }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notification Error:', error.message);
    return new Response(JSON.stringify({ status: 'error', message: 'Failed to process notification request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function processPendingTasks(env) {
  try {
    const accessToken = await getFirestoreAccessToken(env);
    const now = Date.now();

    console.log(`Querying pending tasks at ${new Date(now).toISOString()}`);

    const tasks = await firestoreQuery(
      'aiPendingTasks',
      [],
      accessToken,
      env
    );

    console.log(`Found ${tasks.length} total tasks in aiPendingTasks`);

    for (const task of tasks) {
      const fields = unwrapFirestoreDoc(task);
      if (!fields || fields.status !== 'PENDING') {
        continue;
      }

      // Durable Object manages these tasks with an exact 8-second alarm.
      if (fields.timerManaged === true) {
        continue;
      }

      const scheduledMs = new Date(fields.scheduledTime).getTime();
      if (isNaN(scheduledMs) || scheduledMs > now) {
        console.log(`Task ${fields.messageId} scheduled for future: ${fields.scheduledTime}`);
        continue;
      }

      const tChatId = fields.chatId;
      const tUserId = fields.userId;
      const tMessageId = fields.messageId;
      const taskId = task.name.split('/').pop();

      await processSingleTask(taskId, tChatId, tUserId, tMessageId, accessToken, env);
    }
  } catch (error) {
    console.error('ProcessTasks Error:', error.message);
  }
}

async function processSingleTask(taskId, chatId, userId, messageId, accessToken, env) {
  console.log(`--- Processing Task: ${taskId} ---`);
  try {
    const aiSettings = await firestoreGetWithMeta(
      `chats/${chatId}/aiSettings/${userId}`,
      accessToken,
      env
    );

    if (!aiSettings) {
      console.log('Task Skipped: AI Settings not found');
      await updateTaskStatus(taskId, 'CANCELLED', accessToken, env);
      return 'CANCELLED';
    }

    if (!aiSettings.enabled || aiSettings.state === 'PAUSED') {
      console.log('Task Skipped: AI disabled or human replied');
      await updateTaskStatus(taskId, 'CANCELLED', accessToken, env);
      return 'CANCELLED';
    }

    if (aiSettings.lastIncomingMessageId !== messageId) {
      console.log('Task Skipped: Incoming message is no longer latest');
      await updateTaskStatus(taskId, 'CANCELLED', accessToken, env);
      return 'CANCELLED';
    }

    if (aiSettings.lastProcessedMessageId === messageId) {
      console.log('Task Skipped: Already processed');
      await updateTaskStatus(taskId, 'COMPLETED', accessToken, env);
      return 'COMPLETED';
    }

    await firestoreUpdate(
      `chats/${chatId}/aiSettings/${userId}`,
      { state: 'PROCESSING' },
      accessToken,
      env
    );
    const messages = await firestoreQuery(
      `chats/${chatId}/messages`,
      [],
      accessToken,
      env,
      'timestamp',
      'DESCENDING',
      15
    );

    const history = messages.reverse().map(m => {
      const text = m.fields.text?.stringValue || '';
      const type = m.fields.type?.stringValue || 'text';
      const isAiMsg = m.fields.isAi?.booleanValue === true;
      const senderId = m.fields.senderId?.stringValue || '';
      const isAssistantMsg = isAiMsg || senderId === userId;

      let content = text;
      if (!text && type === 'image') content = '[Sent an image]';
      if (!text && type === 'voice') content = '[Sent a voice message]';

      return {
        role: isAssistantMsg ? 'assistant' : 'user',
        content: content || '[Attachment]'
      };
    });

    const systemPrompt = `You are an AI assistant in a 1-on-1 chat representing user ${userId}.
Analyze the conversation history. The last message is from a human user.
Generate a helpful, warm, concise, and natural response to the last message.
Format your output as a JSON object: { "action": "REPLY_NEEDED", "reply": "your friendly response" }`;

    let result;

    if (env.OPENAI_API_KEY) {
      console.log('Using OpenAI ChatGPT API (gpt-4o-mini)...');
      try {
        const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              ...history
            ],
            response_format: { type: 'json_object' }
          })
        });

        const openAiData = await openAiRes.json();
        if (openAiRes.ok && openAiData.choices?.[0]?.message?.content) {
          const rawContent = openAiData.choices[0].message.content;
          result = JSON.parse(rawContent);
        } else {
          console.error('OpenAI Error Response:', JSON.stringify(openAiData));
          throw new Error('OpenAI API request failed');
        }
      } catch (e) {
        console.error('OpenAI API Error, falling back to Workers AI:', e.message);
        result = await runWorkersAI(env, systemPrompt, history);
      }
    } else {
      console.log('OPENAI_API_KEY unconfigured. Using Cloudflare Workers AI (llama-3.1-8b-instruct)...');
      result = await runWorkersAI(env, systemPrompt, history);
    }

    // Pre-commit double verification before writing AI response to prevent race conditions
    const preCommitAiSettings = await firestoreGetWithMeta(
      `chats/${chatId}/aiSettings/${userId}`,
      accessToken,
      env
    );

    if (
      !preCommitAiSettings ||
      !preCommitAiSettings.enabled ||
      preCommitAiSettings.state === 'PAUSED' ||
      preCommitAiSettings.lastIncomingMessageId !== messageId
    ) {
      console.log('Task Aborted at pre-commit: AI disabled, human replied, or message stale');
      await updateTaskStatus(taskId, 'CANCELLED', accessToken, env);
      return 'CANCELLED';
    }
    const replyText = result?.reply || result?.response || (typeof result === 'string' ? result : null);

    if (replyText) {
      const newMessageId = crypto.randomUUID();
      const timestamp = Date.now();

      const originalMsg = await firestoreGet(`chats/${chatId}/messages/${messageId}`, accessToken, env);
      const recipientId = originalMsg ? originalMsg.senderId : (chatId.split('_').find(id => id !== userId));

      const aiMsg = {
        messageId: newMessageId,
        senderId: userId,
        receiverId: recipientId,
        text: replyText,
        timestamp,
        status: 0,
        isAi: true,
        type: 'text'
      };

      const projectId = getProjectId(env);
      const writes = [
        {
          update: {
            name: `projects/${projectId}/databases/(default)/documents/chats/${chatId}/aiSettings/${userId}`,
            fields: wrapFirestoreDoc({
              enabled: true,
              state: 'RESPONDED',
              lastProcessedMessageId: messageId
            })
          },
          updateMask: {
            fieldPaths: ['enabled', 'state', 'lastProcessedMessageId']
          },
          currentDocument: preCommitAiSettings._updateTime ? { updateTime: preCommitAiSettings._updateTime } : undefined
        },
        {
          update: {
            name: `projects/${projectId}/databases/(default)/documents/chats/${chatId}/messages/${newMessageId}`,
            fields: wrapFirestoreDoc(aiMsg)
          }
        },
        {
          update: {
            name: `projects/${projectId}/databases/(default)/documents/chats/${chatId}`,
            fields: wrapFirestoreDoc({
              lastMessage: replyText,
              lastMessageTimestamp: timestamp,
              lastSenderId: userId
            })
          },
          updateMask: {
            fieldPaths: ['lastMessage', 'lastMessageTimestamp', 'lastSenderId']
          }
        }
      ];

      const commitResult = await firestoreCommitTransaction(writes, accessToken, env);
      if (!commitResult.success) {
        if (commitResult.preconditionFailed) {
          console.log('Task Aborted: Precondition failed during atomic commit due to concurrent user reply');
          await updateTaskStatus(taskId, 'CANCELLED', accessToken, env);
          return 'CANCELLED';
        } else {
          throw new Error('Atomic transaction commit failed with status ' + commitResult.status);
        }
      }

      await handleInternalNotification(chatId, userId, recipientId, 'New Message', replyText, accessToken, env);
    } else {
      await firestoreUpdate(`chats/${chatId}/aiSettings/${userId}`, {
        state: 'RESPONDED',
        lastProcessedMessageId: messageId
      }, accessToken, env);
    }

    await updateTaskStatus(taskId, 'COMPLETED', accessToken, env);
    return 'COMPLETED';

  } catch (error) {
    console.error('ProcessSingleTask Error:', error.message);
    await firestoreUpdate(`chats/${chatId}/aiSettings/${userId}`, { state: 'ERROR' }, accessToken, env);
    await updateTaskStatus(taskId, 'ERROR', accessToken, env);
    return 'ERROR';
  }
}






async function runWorkersAI(env, systemPrompt, history) {
  const aiResponse = await env.AI.run('@cf/openai/gpt-oss-120b', {
    messages: [
      { role: 'system', content: systemPrompt },
      ...history
    ],
    max_tokens: 512
  });

  const rawText = extractWorkersAiText(aiResponse);

  if (!rawText) {
    console.error(
      'Workers AI returned no text. Response keys:',
      Object.keys(aiResponse || {})
    );
    throw new Error('Workers AI returned an empty response');
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('AI JSON parsing failed:', error.message);
    }
  }

  return {
    action: 'REPLY_NEEDED',
    reply: rawText.trim()
  };
}










async function handleInternalNotification(chatId, senderId, recipientId, title, message, accessToken, env) {
  try {
    const recipientDoc = await firestoreGet(`users/${recipientId}`, accessToken, env);
    const fcmToken = recipientDoc?.fcmToken;
    if (!fcmToken) return;

    const senderDoc = await firestoreGet(`users/${senderId}`, accessToken, env);
    const senderName = senderDoc?.displayName || 'Someone';
    const projectId = getProjectId(env);

    await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: {
            title: senderName,
            body: message
          },
          data: {
            title: title,
            body: message,
            chatId: chatId,
            senderId: senderId,
            senderName: senderName
          },
          android: {
            priority: 'high',
            notification: {
              channel_id: 'chat_messages',
              sound: 'default'
            }
          }
        }
      })
    });
  } catch (e) {
    console.error('Internal Notification Error:', e.message);
  }
}

// --- Utilities ---

async function verifyFirebaseToken(token, env) {
  try {
    const jwksUri = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
    const JWKS = createRemoteJWKSet(new URL(jwksUri));
    const projectId = getProjectId(env);

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: 'https://securetoken.google.com/' + projectId,
      audience: projectId
    });
    console.log(`Token verified for user: ${payload.sub}`);
    return payload;
  } catch (e) {
    console.error('Token verification failed:', e.message);
    return null;
  }
}

function base64UrlEncode(input) {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : input;

  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getFirestoreAccessToken(env) {
  const privateKeyRaw = env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const clientEmail = env.FIREBASE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKeyRaw || !clientEmail) {
    throw new Error('Service account credentials (FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY / FIREBASE_SERVICE_ACCOUNT_EMAIL) are unconfigured in worker environment');
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  const iat = Math.floor(Date.now() / 1000) - 60;
  const exp = iat + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const binaryKey = str2ab(atob(privateKey.split('-----BEGIN PRIVATE KEY-----')[1].split('-----END PRIVATE KEY-----')[0].replace(/\s/g, '')));
  const key = await crypto.subtle.importKey('pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signatureInput));

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${signatureInput}.${encodedSignature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error('OAuth2 token exchange failed: ' + (data.error_description || data.error || res.status));
  }
  return data.access_token;
}

function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

async function firestoreGet(path, token, env) {
  const projectId = getProjectId(env);
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status === 404) return null;
  const data = await res.json();
  return unwrapFirestoreDoc(data);
}

async function firestoreGetWithMeta(path, token, env) {
  const projectId = getProjectId(env);
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status === 404) return null;
  const data = await res.json();
  const doc = unwrapFirestoreDoc(data) || {};
  doc._updateTime = data.updateTime;
  return doc;
}

async function firestoreSet(path, data, token, env) {
  const projectId = getProjectId(env);
  const fields = wrapFirestoreDoc(data);
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  return res.json();
}

async function firestoreUpdate(path, data, token, env) {
  const projectId = getProjectId(env);
  const fields = wrapFirestoreDoc(data);
  const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${k}`).join('&');
  await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}?${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
}

async function firestoreDelete(path, token, env) {
  const projectId = getProjectId(env);
  await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function firestoreCommitTransaction(writes, token, env) {
  const projectId = getProjectId(env);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes })
  });

  const data = await res.json();

  if (
    res.status === 412 ||
    res.status === 409 ||
    (res.status === 400 && data.error?.status === 'FAILED_PRECONDITION')
  ) {
    console.warn('Firestore Commit Precondition Failed: Concurrent user update detected');
    return { success: false, preconditionFailed: true, status: res.status };
  }
  if (!res.ok) {
    console.error('Firestore Commit Error:', JSON.stringify(data));
    return { success: false, preconditionFailed: false, status: res.status, error: data };
  }

  return { success: true, data };
}

async function firestoreQuery(collection, filters, token, env, orderBy = null, direction = 'ASCENDING', limit = 100) {
  const projectId = getProjectId(env);
  const query = {
    structuredQuery: {
      from: [{ collectionId: collection.split('/').pop() }],
      where: filters.length > 0 ? (filters.length > 1 ? { compositeFilter: { op: 'AND', filters: filters.map(f => ({ fieldFilter: f })) } } : { fieldFilter: filters[0] }) : undefined,
      limit,
      orderBy: orderBy ? [{ field: { fieldPath: orderBy }, direction }] : undefined
    }
  };

  const parent = collection.includes('/') ? collection.split('/').slice(0, -1).join('/') : '';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents${parent ? '/' + parent : ''}:runQuery`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  });

  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.filter(d => d.document).map(d => d.document);
}

async function updateTaskStatus(taskId, status, accessToken, env) {
  if (status === 'COMPLETED' || status === 'CANCELLED') {
    await firestoreDelete(`aiPendingTasks/${taskId}`, accessToken, env);
  } else {
    await firestoreUpdate(`aiPendingTasks/${taskId}`, { status }, accessToken, env);
  }
}

function unwrapFirestoreDoc(doc) {
  if (!doc.fields) return null;
  const obj = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    obj[key] = unwrapValue(value);
  }
  return obj;
}

function unwrapValue(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return parseInt(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return new Date(value.timestampValue).getTime();
  if ('mapValue' in value) {
    const map = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      map[k] = unwrapValue(v);
    }
    return map;
  }
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(v => unwrapValue(v));
  }
  return null;
}

function wrapFirestoreDoc(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    const wrapped = wrapValue(value);
    if (wrapped) fields[key] = wrapped;
  }
  return fields;
}

function wrapValue(value) {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: value.toString() };
    return { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (value.timestampValue) return value;
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      const w = wrapValue(v);
      if (w) fields[k] = w;
    }
    return { mapValue: { fields } };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(v => wrapValue(v)).filter(v => v !== null) } };
  }
  return null;
}

export class ChatReplyTimer {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    if (new URL(request.url).pathname !== '/schedule') {
      return new Response('Not Found', { status: 404 });
    }

    const task = await request.json();

    if (!task.taskId || !task.chatId || !task.userId || !task.messageId || !Number.isFinite(Number(task.deadline))) {
      return new Response('Missing task data', { status: 400 });
    }

    await this.ctx.blockConcurrencyWhile(async () => {
      await this.ctx.storage.put('pendingTask', task);
      await this.ctx.storage.setAlarm(Math.max(Date.now(), Number(task.deadline)));
    });

    const delayMs = Math.max(0, Number(task.deadline) - Date.now());

    console.log(`ChatReplyTimer: Scheduled ${task.messageId} with ${delayMs}ms remaining`);

    return Response.json({ status: 'scheduled', delayMs });
  }

  async alarm() {
    const task = await this.ctx.storage.get('pendingTask');
    if (!task) return;

    try {
      const accessToken = await getFirestoreAccessToken(this.env);

      const result = await processSingleTask(
        task.taskId,
        task.chatId,
        task.userId,
        task.messageId,
        accessToken,
        this.env
      );

      if (!['COMPLETED', 'CANCELLED', 'ERROR'].includes(result)) {
        throw new Error(`Unexpected task result: ${result}`);
      }

      const latestTask = await this.ctx.storage.get('pendingTask');

      // Do not remove a newer message's timer.
      if (latestTask?.messageId === task.messageId) {
        await this.ctx.storage.delete('pendingTask');
      }

    } catch (error) {
      console.error('ChatReplyTimer Alarm Error:', error.message);
      throw error;
    }
  }
}



