// Simple script to promote a user to admin
// Usage: node setup-admin.js <email>

const email = process.argv[2];

if (!email) {
  console.log('Usage: node setup-admin.js <email>');
  console.log('Example: node setup-admin.js user@example.com');
  process.exit(1);
}

async function setupAdmin() {
  try {
    const response = await fetch('http://localhost:5174/api/admin/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        secret: 'admin-setup-2024'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result.message);
      console.log('User details:', result.user);
    } else {
      console.log('❌ Error:', result.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

setupAdmin();
