// Script à coller dans la console de ChatGPT pour forcer l'anonymisation
(function() {
    console.log('🛡️ WHISPER MANUAL OVERRIDE ACTIVATED');
    
    // Override global File constructor
    const OriginalFile = window.File;
    
    window.File = function(fileBits, fileName, options) {
        console.log('📁 File constructor intercepted:', fileName);
        
        // Check if this looks like a file that should be anonymized
        if (fileName && (fileName.includes('.conf') || fileName.includes('.txt') || fileName.includes('.py'))) {
            console.log('🔒 File matches anonymization criteria');
            
            // Try to anonymize the content if it's text
            if (typeof fileBits[0] === 'string') {
                const originalContent = fileBits[0];
                console.log('📝 Original content length:', originalContent.length);
                
                // Simple replacement for demo
                let anonymizedContent = originalContent
                    .replace(/admin@company\.com/g, '***EMAIL_1***')
                    .replace(/nginx-admin@company\.com/g, '***EMAIL_2***')
                    .replace(/david\.bernard@security\.com/g, '***EMAIL_3***')
                    .replace(/192\.168\.1\.\d+/g, '***IP_PRIVEE_1***')
                    .replace(/Sophie MARTIN/g, '***NAME_1***')
                    .replace(/David BERNARD/g, '***NAME_2***')
                    .replace(/01 23 45 67 89/g, '***PHONE_1***');
                
                console.log('✅ Content anonymized, new length:', anonymizedContent.length);
                
                return new OriginalFile([anonymizedContent], fileName, options);
            }
        }
        
        return new OriginalFile(fileBits, fileName, options);
    };
    
    // Copy prototype and static properties
    window.File.prototype = OriginalFile.prototype;
    Object.setPrototypeOf(window.File, OriginalFile);
    
    console.log('🎯 Manual override ready. Try uploading a file now!');
})();