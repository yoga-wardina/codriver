const { spawn } = require('child_process');

console.log('Starting server...');
const server = spawn('npx', ['ts-node', 'src/server.ts'], {
  cwd: '/home/yoga/proj/codriver/backend',
  stdio: ['inherit', 'inherit', 'inherit'],
});

server.on('error', (error) => {
  console.error('Server failed to start:', error);
});

// Wait for server to start
setTimeout(async () => {
  try {
    console.log('Testing health endpoint...');
    const response = await fetch('http://localhost:3001/api/health');
    const data = await response.json();
    console.log('Health check successful:', data);

    console.log('Testing test route...');
    const testResponse = await fetch('http://localhost:3001/api/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'data' }),
    });
    const testData = await testResponse.json();
    console.log('Test route result:', testData);

    console.log('Creating conversation...');
    const createResponse = await fetch('http://localhost:3001/api/chat/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Test Conversation' }),
    });
    const createData = await createResponse.json();
    console.log('Create conversation result:', createData);

    if (createData.success && createData.conversationId) {
      const conversationId = createData.conversationId;
      console.log('Conversation created with ID:', conversationId);

      console.log('Adding message...');
      const messageResponse = await fetch(`http://localhost:3001/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'user',
          content: 'Hello, can you help me with coding?',
        }),
      });
      const messageData = await messageResponse.json();
      console.log('Add message result:', messageData);

      console.log('Getting conversation...');
      const getResponse = await fetch(`http://localhost:3001/api/chat/conversations/${conversationId}`);
      const getData = await getResponse.json();
      console.log('Get conversation result:', getData);
    }

    console.log('Tests completed successfully!');
    server.kill('SIGINT');
  } catch (error) {
    console.error('Test failed:', error);
    server.kill('SIGINT');
  }
}, 3000);
