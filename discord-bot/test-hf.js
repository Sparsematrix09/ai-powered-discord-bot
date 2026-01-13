// test-working-model.js
require('dotenv').config();

const HF_TOKEN = process.env.HF_TOKEN;

async function testWithCorrectModel() {
    console.log('🚀 Testing with REAL available model...');
    
    try {
        // Use a model from your list
        const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta-llama/Llama-3.1-8B-Instruct',  // From your list
                messages: [
                    { role: 'user', content: 'Hello! How are you today?' }
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });
        
        console.log('Status:', response.status, response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS! Got response');
            console.log('Full response:', JSON.stringify(data, null, 2));
            
            if (data.choices && data.choices[0]) {
                console.log('\n🤖 AI Response:', data.choices[0].message.content);
            }
        } else {
            const error = await response.json();
            console.log('❌ Error:', error);
            
            // Try a different model
            if (error.error?.code === 'model_not_found') {
                console.log('\n🔄 Trying alternative model...');
                await tryAlternativeModels();
            }
        }
        
    } catch (error) {
        console.error('Network error:', error.message);
    }
}

async function tryAlternativeModels() {
    // Try different models from your list
    const models = [
        'MiniMaxAI/MiniMax-M2.1',
        'zai-org/GLM-4.7', 
        'Qwen/Qwen3-4B-Instruct-2507',
        'marin-community/marin-8b-instruct'
    ];
    
    for (const model of models) {
        console.log(`\n🔍 Trying model: ${model}`);
        
        try {
            const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'user', content: 'Hello' }
                    ],
                    max_tokens: 30
                })
            });
            
            console.log(`Status for ${model}: ${response.status}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ${model} WORKS!`);
                console.log('Response:', data.choices?.[0]?.message?.content || 'No content');
                return model; // Return the working model
            }
            
        } catch (error) {
            console.log(`Error with ${model}:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
    }
    
    return null;
}

testWithCorrectModel();