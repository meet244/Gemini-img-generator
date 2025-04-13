document.addEventListener('DOMContentLoaded', function() {
    // Handle splash screen animation
    const splashScreen = document.getElementById('splash-screen');
    const mainContent = document.getElementById('main-content');
    const splashContent = document.querySelector('.splash-content');
    
    // Add content to splash screen
    splashContent.innerHTML = `
        <div class="text-center">
            <h1 class="text-4xl font-bold mb-2 text-white">Gemini Image Generator</h1>
            <p class="text-xl text-gray-200">Made by <a href="https://github.com/meet244" target="_blank" class="text-indigo-300 hover:text-indigo-200 underline">Meet</a></p>
        </div>
    `;
    
    // Show splash screen for 1.5 seconds before fading out
    setTimeout(() => {
        splashScreen.classList.add('split');
        
        // After split animation, hide splash and show main content
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            mainContent.classList.add('visible');
        }, 800);
    }, 1500);
    
    // DOM Elements
    const apiKeyInput = document.getElementById('api-key');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key');
    const promptTextarea = document.getElementById('prompt');
    const uploadImageBtn = document.getElementById('upload-image');
    const fileInput = document.getElementById('file-input');
    const imagesContainer = document.getElementById('images-container');
    const sendButton = document.getElementById('send-button');
    const resultsContainer = document.getElementById('results');
    const resultBoxes = document.querySelectorAll('.result-box');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const lightIcon = document.getElementById('light-icon');
    const darkIcon = document.getElementById('dark-icon');
    const dropZone = document.getElementById('drop-zone');
    const dragOverlay = document.getElementById('drag-overlay');
    
    // Lightbox elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightboxBtn = document.getElementById('close-lightbox');
    const prevImage = document.getElementById('prev-image');
    const nextImage = document.getElementById('next-image');
    const lightboxCounter = document.getElementById('lightbox-counter');

    let imageDataArray = []; // Array to store multiple images
    let dragCounter = 0;
    let generatedImages = []; // Store generated image data
    let currentImageIndex = 0;
    let generatedImagesHistory = []; // Array to store generated image history
    let likedImages = []; // Array to store liked images

    // Functions for localStorage management
    // These remain the same as in original implementation
    function loadSavedValues() {
        // Load API key
        const savedApiKey = localStorage.getItem('gemini_api_key');
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
        }
        
        // Load prompt
        const savedPrompt = localStorage.getItem('gemini_prompt');
        if (savedPrompt) {
            promptTextarea.value = savedPrompt;
            // Auto-resize the textarea
            promptTextarea.style.height = 'auto';
            promptTextarea.style.height = (promptTextarea.scrollHeight) + 'px';
        }
        
        // Don't load images from localStorage anymore
        imageDataArray = [];
    }

    // Save values to localStorage
    function saveValues() {
        // Save API key
        localStorage.setItem('gemini_api_key', apiKeyInput.value);
        
        // Save prompt
        localStorage.setItem('gemini_prompt', promptTextarea.value);
        
        // Don't save images to localStorage anymore
        localStorage.removeItem('gemini_images');
    }

    // Function to load image history and liked images from localStorage
    function loadImageCollections() {
        // Don't load history from localStorage anymore
        generatedImagesHistory = [];
        
        try {
            const savedLiked = localStorage.getItem('gemini_liked');
            if (savedLiked) {
                likedImages = JSON.parse(savedLiked);
                updateLikedCount();
            }
        } catch (error) {
            console.error('Error loading liked images:', error);
            // Clear potentially corrupted data
            localStorage.removeItem('gemini_liked');
            likedImages = [];
        }
    }

    // Function to save image history to localStorage
    function saveImageHistory() {
        // Don't save image history to localStorage anymore
        localStorage.removeItem('gemini_history');
    }

    // Function to save liked images to localStorage
    function saveLikedImages() {
        try {
            if (likedImages.length > 0) {
                const likedString = JSON.stringify(likedImages);
                if (likedString.length < 4 * 1024 * 1024) {
                    localStorage.setItem('gemini_liked', likedString);
                } else {
                    console.warn('Liked images too large for localStorage');
                    // Keep only the newest liked images
                    while (likedImages.length > 20 && JSON.stringify(likedImages).length >= 4 * 1024 * 1024) {
                        likedImages.pop();
                    }
                    localStorage.setItem('gemini_liked', JSON.stringify(likedImages));
                }
            } else {
                localStorage.removeItem('gemini_liked');
            }
            updateLikedCount();
        } catch (error) {
            console.error('Error saving liked images:', error);
        }
    }

    // Function to toggle like status of an image
    function toggleLike(imageData, timestamp) {
        // Check if image is already liked
        const existingIndex = likedImages.findIndex(img => img.data === imageData);
        
        if (existingIndex === -1) {
            // Add to liked images
            likedImages.unshift({
                data: imageData,
                timestamp: timestamp || new Date().toISOString()
            });
        } else {
            // Remove from liked images
            likedImages.splice(existingIndex, 1);
        }
        
        // Save updated liked images
        saveLikedImages();
        
        // Update UI if on liked tab
        if (document.getElementById('liked-tab').getAttribute('aria-selected') === 'true') {
            displayLikedImages();
        }
        
        return existingIndex === -1; // Return true if image was added to likes
    }

    // Function to check if an image is liked
    function isImageLiked(imageData) {
        return likedImages.some(img => img.data === imageData);
    }

    // Function to update the liked count badge
    function updateLikedCount() {
        const likedCount = document.getElementById('liked-count');
        likedCount.textContent = likedImages.length;
    }

    // Function to switch between tabs
    function switchTab(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('[role="tab"]').forEach(tab => {
            tab.classList.remove('active', 'text-indigo-600', 'dark:text-indigo-400', 'border-indigo-600');
            tab.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
            tab.setAttribute('aria-selected', 'false');
        });
        
        // Show selected tab content
        const selectedContent = document.getElementById(tabId + '-content');
        selectedContent.classList.remove('hidden');
        
        // Set active class on selected tab
        const selectedTab = document.getElementById(tabId + '-tab');
        selectedTab.classList.add('active', 'text-indigo-600', 'dark:text-indigo-400', 'border-indigo-600');
        selectedTab.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
        selectedTab.setAttribute('aria-selected', 'true');
        
        // Load content for specific tabs
        if (tabId === 'history') {
            displayImageHistory();
        } else if (tabId === 'liked') {
            displayLikedImages();
        }
    }

    // Function to display image history
    function displayImageHistory() {
        const historyContainer = document.getElementById('history-container');
        
        // Clear container
        historyContainer.innerHTML = '';
        
        if (generatedImagesHistory.length === 0) {
            historyContainer.innerHTML = '<div class="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">No generation history yet</div>';
            return;
        }
        
        // Add each image to history
        generatedImagesHistory.forEach((item, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'history-item';
            
            // Create image
            const img = document.createElement('img');
            img.src = 'data:image/png;base64,' + item.data;
            img.alt = 'Generated image';
            
            // Add like button
            const likeButton = createLikeButton(item.data, item.timestamp);
            
            // Add click handler for fullscreen view
            imageItem.addEventListener('click', function(e) {
                if (e.target !== likeButton && !likeButton.contains(e.target)) {
                    openHistoryLightbox(index);
                }
            });
            
            imageItem.appendChild(img);
            imageItem.appendChild(likeButton);
            historyContainer.appendChild(imageItem);
        });
    }

    // Function to display liked images
    function displayLikedImages() {
        const likedContainer = document.getElementById('liked-container');
        
        // Clear container
        likedContainer.innerHTML = '';
        
        if (likedImages.length === 0) {
            likedContainer.innerHTML = '<div class="text-gray-500 dark:text-gray-400 col-span-full text-center py-8">No liked images yet</div>';
            return;
        }
        
        // Add each liked image
        likedImages.forEach((item, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'liked-item';
            
            // Create image
            const img = document.createElement('img');
            img.src = 'data:image/png;base64,' + item.data;
            img.alt = 'Liked image';
            
            // Add like button (always in liked state)
            const likeButton = createLikeButton(item.data, item.timestamp, true);
            
            // Add click handler for fullscreen view
            imageItem.addEventListener('click', function(e) {
                if (e.target !== likeButton && !likeButton.contains(e.target)) {
                    openLikedLightbox(index);
                }
            });
            
            imageItem.appendChild(img);
            imageItem.appendChild(likeButton);
            likedContainer.appendChild(imageItem);
        });
    }

    // Create a like button for an image
    function createLikeButton(imageData, timestamp, initialLiked = null) {
        const likeBtn = document.createElement('button');
        likeBtn.className = 'like-btn';
        if (initialLiked !== null ? initialLiked : isImageLiked(imageData)) {
            likeBtn.classList.add('liked');
        }
        
        likeBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
        `;
        
        likeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isNowLiked = toggleLike(imageData, timestamp);
            
            if (isNowLiked) {
                likeBtn.classList.add('liked');
            } else {
                likeBtn.classList.remove('liked');
            }
        });
        
        return likeBtn;
    }

    // Format timestamp to readable format
    function formatTimestamp(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const options = { month: 'short', day: 'numeric' };
        if (date.getFullYear() !== now.getFullYear()) {
            options.year = 'numeric';
        }
        
        return date.toLocaleDateString(undefined, options);
    }

    // Open lightbox for history images
    function openHistoryLightbox(startIndex) {
        if (generatedImagesHistory.length === 0) return;
        
        const historySources = generatedImagesHistory.map(item => item.data);
        openCustomLightbox(historySources, startIndex);
    }

    // Open lightbox for liked images
    function openLikedLightbox(startIndex) {
        if (likedImages.length === 0) return;
        
        const likedSources = likedImages.map(item => item.data);
        openCustomLightbox(likedSources, startIndex);
    }

    // Open custom lightbox with specified image list and index
    function openCustomLightbox(imageSources, startIndex) {
        currentImageIndex = startIndex;
        generatedImages = imageSources; // Reuse the existing lightbox with our custom images
        
        // Show lightbox
        lightbox.classList.remove('hidden');
        setTimeout(() => {
            lightbox.classList.add('active');
        }, 10);
        
        // Update image
        lightboxImg.src = 'data:image/png;base64,' + generatedImages[currentImageIndex];
        
        // Update counter
        lightboxCounter.textContent = `${currentImageIndex + 1} / ${generatedImages.length}`;
        
        // Disable scrolling on body
        document.body.style.overflow = 'hidden';
    }
    
    // Lightbox functionality
    function openLightbox(imageIndex) {
        if (generatedImages.length === 0) return;
        
        currentImageIndex = imageIndex;
        updateLightboxImage();
        
        // Show lightbox with animation
        lightbox.classList.remove('hidden');
        setTimeout(() => {
            lightbox.classList.add('active');
        }, 10);
        
        // Update counter
        updateCounter();
        
        // Disable scrolling on body
        document.body.style.overflow = 'hidden';
    }
    
    function closeLightbox() {
        // Hide with animation
        lightbox.classList.remove('active');
        setTimeout(() => {
            lightbox.classList.add('hidden');
        }, 300);
        
        // Re-enable scrolling
        document.body.style.overflow = '';
    }
    
    function updateLightboxImage() {
        lightboxImg.src = 'data:image/png;base64,' + generatedImages[currentImageIndex];
    }
    
    function updateCounter() {
        lightboxCounter.textContent = `${currentImageIndex + 1} / ${generatedImages.length}`;
    }
    
    function nextLightboxImage() {
        currentImageIndex = (currentImageIndex + 1) % generatedImages.length;
        updateLightboxImage();
        updateCounter();
    }
    
    function prevLightboxImage() {
        currentImageIndex = (currentImageIndex - 1 + generatedImages.length) % generatedImages.length;
        updateLightboxImage();
        updateCounter();
    }
    
    // Set up lightbox event listeners
    closeLightboxBtn.addEventListener('click', closeLightbox);
    nextImage.addEventListener('click', nextLightboxImage);
    prevImage.addEventListener('click', prevLightboxImage);
    
    // Close lightbox when clicking outside the image
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // Keyboard navigation for lightbox
    document.addEventListener('keydown', function(e) {
        if (!lightbox.classList.contains('active')) return;
        
        switch (e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowRight':
                nextLightboxImage();
                break;
            case 'ArrowLeft':
                prevLightboxImage();
                break;
        }
    });

    // NEW FUNCTION: Generate a single image with retry logic
    async function generateSingleImage(apiKey, prompt, imageData, retryCount = 0, maxRetries = 3) {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent";
        
        const parts = [{"text": prompt}];
        
        // Add image if provided
        if (imageData) {
            // Extract mime type and data
            const mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];
            const imageContent = imageData.split(',')[1];
            parts.push({
                "inline_data": {
                    "mime_type": mimeType,
                    "data": imageContent
                }
            });
        }
        
        const payload = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "responseModalities": ["image", "text"],
                "responseMimeType": "text/plain",
            }
        };
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify(payload)
            });
            
            if (response.status === 200) {
                const result = await response.json();
                
                try {
                    // Extract image data from response
                    if ('candidates' in result && 
                        result.candidates.length > 0 && 
                        'content' in result.candidates[0]) {
                        
                        const content = result.candidates[0].content;
                        if ('parts' in content && content.parts.length > 0) {
                            for (const part of content.parts) {
                                if ('inlineData' in part) {
                                    return {
                                        success: true, 
                                        data: part.inlineData.data
                                    };
                                }
                            }
                        }
                    }
                    throw new Error("No image data found in response");
                } catch (e) {
                    console.error("Error parsing response:", e);
                    if (retryCount < maxRetries) {
                        return generateSingleImage(apiKey, prompt, imageData, retryCount + 1, maxRetries);
                    }
                    
                    // If we've exhausted all retries, return the specific error
                    return {
                        success: false,
                        error: e.message || "Error parsing response"
                    };
                }
            } else if (response.status === 429) {
                // Rate limit - add exponential backoff
                const backoffTime = (2 ** retryCount) + Math.random();
                console.log(`Rate limited. Backing off for ${backoffTime.toFixed(2)} seconds before retry ${retryCount+1}`);
                await new Promise(resolve => setTimeout(resolve, backoffTime * 1000));
                
                if (retryCount < maxRetries) {
                    return generateSingleImage(apiKey, prompt, imageData, retryCount + 1, maxRetries);
                }
            } else {
                // Other API error
                console.error(`API error (${response.status}):`, await response.text());
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return generateSingleImage(apiKey, prompt, imageData, retryCount + 1, maxRetries);
                }
            }
        } catch (e) {
            console.error("Request error:", e);
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return generateSingleImage(apiKey, prompt, imageData, retryCount + 1, maxRetries);
            }
        }
        
        // If we get here, all retries failed
        return {
            success: false, 
            error: "Failed to generate image after multiple attempts"
        };
    }

    // NEW FUNCTION: Generate multiple images in parallel
    async function generateImages(apiKey, prompt, imageData, count = 4) {
        // Reset generated images array
        generatedImages = [];
        
        // Reset result boxes and show shimmer
        resultBoxes.forEach(box => {
            box.innerHTML = '';
            box.classList.remove('loaded');
            box.classList.add('shimmer');
            
            // Add loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'absolute inset-0 flex items-center justify-center';
            loadingDiv.innerHTML = '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>';
            box.appendChild(loadingDiv);
        });
        
        // Create array to track individual image completion
        const completedImages = new Array(count).fill(false);
        
        // Function to process each completed image individually
        const processImage = (result, index) => {
            completedImages[index] = true;
            
            if (index < resultBoxes.length) {
                resultBoxes[index].classList.remove('shimmer');
                
                if (result.success) {
                    // Store image data
                    const imgIndex = generatedImages.push(result.data) - 1;
                    
                    // Add to history
                    generatedImagesHistory.unshift({
                        data: result.data,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Create and append image
                    const img = document.createElement('img');
                    img.src = 'data:image/png;base64,' + result.data;
                    img.dataset.index = imgIndex;
                    
                    // Handle image load events
                    img.onload = function() {
                        // Add loaded class
                        resultBoxes[index].classList.add('loaded');
                    };
                    
                    img.onerror = function() {
                        console.error(`Error loading image ${index}`);
                        resultBoxes[index].innerHTML = '<div class="flex items-center justify-center h-full text-red-500">Image failed to load</div>';
                    };
                    
                    // Add click handler for fullscreen view
                    img.addEventListener('click', function() {
                        openLightbox(parseInt(this.dataset.index));
                    });
                    
                    // Clear the box and append the image
                    resultBoxes[index].innerHTML = '';
                    resultBoxes[index].appendChild(img);
                    
                    // Add like button to each generated image
                    const likeButton = createLikeButton(result.data);
                    resultBoxes[index].appendChild(likeButton);
                } else {
                    // Display error message for failed image
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'flex flex-col items-center justify-center h-full text-center p-4';
                    
                    const errorIcon = document.createElement('div');
                    errorIcon.className = 'text-red-500 mb-2';
                    errorIcon.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    `;
                    
                    const errorText = document.createElement('div');
                    errorText.className = 'text-red-600 dark:text-red-400 text-sm';
                    
                    // Customize error message based on the error
                    if (result.error && result.error.includes("No image data found")) {
                        errorText.textContent = 'Gemini didn\'t return an image. Try a different prompt.';
                    } else {
                        errorText.textContent = 'Failed to generate image after multiple attempts';
                    }
                    
                    errorDiv.appendChild(errorIcon);
                    errorDiv.appendChild(errorText);
                    
                    resultBoxes[index].innerHTML = '';
                    resultBoxes[index].appendChild(errorDiv);
                }
            }
            
            // Save history when all images are processed
            if (completedImages.every(done => done)) {
                saveImageHistory();
            }
        };
        
        // Generate each image independently with its own promise
        for (let i = 0; i < count; i++) {
            const index = i;
            generateSingleImage(apiKey, prompt, imageData)
                .then(result => {
                    processImage(result, index);
                })
                .catch(error => {
                    processImage({
                        success: false,
                        error: error.message || "Error generating image"
                    }, index);
                });
        }
        
        // Return a promise that resolves when all images are completed
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (completedImages.every(done => done)) {
                    clearInterval(checkInterval);
                    resolve(completedImages);
                }
            }, 100);
        });
    }

    // Send button click handler - updated for direct API calls
    sendButton.addEventListener('click', async function() {
        const apiKey = apiKeyInput.value.trim();
        const prompt = promptTextarea.value.trim();
        
        if (!apiKey) {
            alert('Please enter your Gemini API key');
            return;
        }
        
        if (!prompt) {
            alert('Please enter a prompt');
            return;
        }
        
        // Save values to localStorage
        saveValues();
        
        // Disable send button while processing
        sendButton.disabled = true;
        sendButton.textContent = 'Generating...';
        
        // Get the first image for now
        const imageToSend = imageDataArray.length > 0 ? imageDataArray[0] : null;
        
        try {
            // Generate images - each will display as it completes
            await generateImages(apiKey, prompt, imageToSend);
        } catch (error) {
            console.error('Error:', error);
            
            // Don't show alert for expected errors that are already handled in the UI
            if (!error.message?.includes('No images were') && !error.message?.includes('failed to generate')) {
                alert('Error: ' + error.message);
            }
        } finally {
            // Re-enable send button
            sendButton.disabled = false;
            sendButton.textContent = 'Generate Images';
        }
    });

    // Add keyboard shortcut (Ctrl+Enter) to generate images
    promptTextarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault(); // Prevent default behavior (new line)
            sendButton.click(); // Trigger the send button click
        }
    });

    // Initialize by loading saved values
    loadSavedValues();
    loadImageCollections();

    // Save values when they change
    apiKeyInput.addEventListener('change', saveValues);
    promptTextarea.addEventListener('change', saveValues);

    // Theme toggle functionality
    function initTheme() {
        // Check for saved theme preference or use preferred color scheme
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.classList.add('dark');
            lightIcon.classList.add('hidden');
            darkIcon.classList.remove('hidden');
        } else {
            document.documentElement.classList.remove('dark');
            lightIcon.classList.remove('hidden');
            darkIcon.classList.add('hidden');
        }
    }

    // Initialize theme on page load
    initTheme();

    // Toggle theme when button is clicked
    themeToggleBtn.addEventListener('click', function() {
        const isDark = document.documentElement.classList.contains('dark');
        
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            lightIcon.classList.remove('hidden');
            darkIcon.classList.add('hidden');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            lightIcon.classList.add('hidden');
            darkIcon.classList.remove('hidden');
        }
    });

    // Toggle API key visibility
    toggleApiKeyBtn.addEventListener('click', function() {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleApiKeyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
            `;
        } else {
            apiKeyInput.type = 'password';
            toggleApiKeyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            `;
        }
    });

    // Auto-resize textarea as user types
    promptTextarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Save prompt as user types (with debounce)
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(saveValues, 500);
    });

    // Handle image upload via button
    uploadImageBtn.addEventListener('click', function() {
        fileInput.click();
    });

    // Handle file selection
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            handleImageFile(file);
        }
    });

    // Function to remove an image by index
    function removeImage(index) {
        imageDataArray.splice(index, 1);
        updateImagePreviews();
        // Save to localStorage after removing an image
        saveValues();
    }

    // Handle paste from clipboard (Ctrl+V)
    document.addEventListener('paste', function(e) {
        if (document.activeElement === promptTextarea) {
            const items = e.clipboardData.items;
            
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    handleImageFile(file);
                    break;
                }
            }
        }
    });

    // Drag and drop functionality
    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        promptTextarea.classList.add('drag-active');
        dragOverlay.classList.remove('hidden');
        document.body.classList.add('dragging-active');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            promptTextarea.classList.remove('drag-active');
            dragOverlay.classList.add('hidden');
            document.body.classList.remove('dragging-active');
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        promptTextarea.classList.remove('drag-active');
        dragOverlay.classList.add('hidden');
        document.body.classList.remove('dragging-active');
        dragCounter = 0;
        
        const dt = e.dataTransfer;
        if (dt.files.length) {
            const file = dt.files[0];
            if (file.type.startsWith('image/')) {
                handleImageFile(file);
            }
        }
    }

    // Remove previous drag and drop event listeners from dropZone
    dropZone.removeEventListener('dragenter', handleDragEnter);
    dropZone.removeEventListener('dragleave', handleDragLeave);
    dropZone.removeEventListener('dragover', handleDragOver);
    dropZone.removeEventListener('drop', handleDrop);

    // Add drag and drop event listeners only to the textarea
    promptTextarea.addEventListener('dragenter', handleDragEnter);
    promptTextarea.addEventListener('dragleave', handleDragLeave);
    promptTextarea.addEventListener('dragover', handleDragOver);
    promptTextarea.addEventListener('drop', handleDrop);

    // Function to handle an image file
    function handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Add image data to array
            imageDataArray.push(e.target.result);
            // Update image previews
            updateImagePreviews();
            // Save to localStorage after adding an image
            saveValues();
        };
        reader.readAsDataURL(file);
    }

    // Function to update image preview containers
    function updateImagePreviews() {
        // Clear the container
        imagesContainer.innerHTML = '';
        
        // Add each image preview
        imageDataArray.forEach((imageData, index) => {
            const container = document.createElement('div');
            container.className = 'image-preview-container';
            
            const img = document.createElement('img');
            img.src = imageData;
            img.alt = `Image ${index + 1}`;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image-btn';
            removeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            `;
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                removeImage(index);
            });
            
            container.appendChild(img);
            container.appendChild(removeBtn);
            imagesContainer.appendChild(container);
        });
    }

    // Tab elements
    const generateTab = document.getElementById('generate-tab');
    const historyTab = document.getElementById('history-tab');
    const likedTab = document.getElementById('liked-tab');
    
    // Set up tab switching
    generateTab.addEventListener('click', () => switchTab('generate'));
    historyTab.addEventListener('click', () => switchTab('history'));
    likedTab.addEventListener('click', () => switchTab('liked'));

    // Initialize with the generate tab active
    switchTab('generate');
}); 