// utils/image-generation.js

// Main image generation function - Simple Clipdrop implementation
export async function generateImage(prompt, settings) {
  const { api_key } = settings;
  
  if (!api_key) {
    return {
      success: false,
      error: 'Clipdrop API key not configured'
    };
  }
  
  try {
    // Create form data for Clipdrop API
    const formData = new FormData();
    formData.append('prompt', prompt);
    
    // Optional negative prompt if provided
    if (settings.negative_prompt) {
      formData.append('negative_prompt', settings.negative_prompt);
    }
    
    // Call Clipdrop API
    const response = await fetch('https://clipdrop-api.co/text-to-image/v1', {
      method: 'POST',
      headers: {
        'x-api-key': api_key
      },
      body: formData
    });
    
    if (!response.ok) {
      let errorText = 'Unknown error';
      try {
        errorText = await response.text();
      } catch (e) {
        // Ignore text parsing errors
      }
      
      // Handle specific Clipdrop errors
      if (response.status === 400) {
        throw new Error('Invalid prompt. Please try a different description.');
      } else if (response.status === 401) {
        throw new Error('API key is invalid.');
      } else if (response.status === 402) {
        throw new Error('Out of credits. Please contact administrator.');
      } else if (response.status === 403) {
        throw new Error('Prompt violates content policy.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait.');
      } else {
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
    }
    
    // Get image as blob
    const imageBlob = await response.blob();
    
    // Convert blob to base64 for easy handling
    const base64Image = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(imageBlob);
    });
    
    return {
      success: true,
      image: base64Image, // Base64 image data
      url: null, // We don't get a URL from Clipdrop, we get the image directly
      model: 'clipdrop-text-to-image',
      size: '1024x1024' // Clipdrop always returns 1024x1024
    };
    
  } catch (error) {
    console.error('Clipdrop image generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Validate image prompt (safety check)
export function validateImagePrompt(prompt) {
  const bannedWords = [
    'nude', 'naked', 'porn', 'sex', 'violence', 'gore',
    'racist', 'hate', 'terrorist', 'illegal', 'drug'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  
  for (const word of bannedWords) {
    if (lowerPrompt.includes(word)) {
      return {
        valid: false,
        reason: `Prompt contains inappropriate content`
      };
    }
  }
  
  // Check prompt length (Clipdrop max is 1000)
  if (prompt.length > 1000) {
    return {
      valid: false,
      reason: 'Prompt too long (max 1000 characters)'
    };
  }
  
  if (prompt.length < 3) {
    return {
      valid: false,
      reason: 'Prompt too short (min 3 characters)'
    };
  }
  
  return {
    valid: true
  };
}

// Estimate token usage (for logging purposes)
export function estimateTokenUsage(prompt) {
  // Clipdrop charges per image, not per token
  // Return approximate token count for analytics
  return Math.ceil(prompt.length / 4);
}

// Simple function to enhance prompts for better results
export function enhancePrompt(prompt) {
  // Add some quality keywords if not present
  const qualityKeywords = ['high quality', 'detailed', 'sharp focus'];
  const lowerPrompt = prompt.toLowerCase();
  
  let enhanced = prompt;
  
  // Check if quality keywords are already present
  const hasQuality = qualityKeywords.some(keyword => 
    lowerPrompt.includes(keyword)
  );
  
  if (!hasQuality) {
    enhanced = `${prompt}, high quality, detailed`;
  }
  
  // Ensure we don't exceed max length
  if (enhanced.length > 1000) {
    enhanced = enhanced.substring(0, 1000);
  }
  
  return enhanced;
}