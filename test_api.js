const token = require('jsonwebtoken').sign({ id: 1, tc: '12345678940', role: 'ogretmen', name: 'Test' }, 'eba-secret-2026', { expiresIn: '1h' });

async function test() {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      receiver_tc: '12345678941',
      content: 'Hello from API test'
    })
  });
  
  const data = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", data);
}
test();
