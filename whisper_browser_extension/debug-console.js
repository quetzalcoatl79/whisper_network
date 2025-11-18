// Test API direct (à coller dans la console)
async function testApiDirect() {
  try {
    console.log('🔧 Test API direct...');
    const response = await fetch('http://localhost:8001/health');
    const data = await response.json();
    console.log('✅ API Response:', data);
    
    // Test anonymisation
    const testResponse = await fetch('http://localhost:8001/anonymize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Mon email est test@example.com',
        settings: { anonymize_email: true }
      })
    });
    
    const testData = await testResponse.json();
    console.log('✅ Anonymisation Response:', testData);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Lancer le test
testApiDirect();