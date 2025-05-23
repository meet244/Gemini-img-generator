document.addEventListener('DOMContentLoaded', function() {
    // Handle splash screen - show without animations
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
    
    // Show splash screen for 1.5 seconds before hiding it immediately (no animations)
    setTimeout(() => {
        // Hide splash and show main content immediately without animations
        splashScreen.classList.add('hidden');
        mainContent.classList.add('visible');
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
    
    // Image count elements
    const imageCountInput = document.getElementById('image-count');
    const decreaseCountBtn = document.getElementById('decrease-count');
    const increaseCountBtn = document.getElementById('increase-count');
    
    // Lightbox elements
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightboxBtn = document.getElementById('close-lightbox');
    const prevImage = document.getElementById('prev-image');
    const nextImage = document.getElementById('next-image');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const lightboxDownload = document.getElementById('lightbox-download');
    const lightboxLike = document.getElementById('lightbox-like');

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
        
        // Load image count
        const savedImageCount = localStorage.getItem('gemini_image_count');
        if (savedImageCount) {
            imageCountInput.value = savedImageCount;
            // Update result boxes to match saved count
            updateResultBoxesCount(savedImageCount);
        }
        
        // Load saved uploaded images
        try {
            const savedImages = localStorage.getItem('gemini_uploaded_images');
            if (savedImages) {
                imageDataArray = JSON.parse(savedImages);
                updateImagePreviews();
            }
        } catch (error) {
            console.error('Error loading saved images:', error);
            // Clear potentially corrupted data
            localStorage.removeItem('gemini_uploaded_images');
            imageDataArray = [];
        }
    }

    // Save values to localStorage
    function saveValues() {
        // Save API key
        localStorage.setItem('gemini_api_key', apiKeyInput.value);
        
        // Save prompt
        localStorage.setItem('gemini_prompt', promptTextarea.value);
        
        // Save image count
        localStorage.setItem('gemini_image_count', imageCountInput.value);
        
        // Save uploaded images
        try {
            if (imageDataArray.length > 0) {
                const imagesString = JSON.stringify(imageDataArray);
                // Check if we're within localStorage size limits (typically ~5MB)
                if (imagesString.length < 2 * 1024 * 1024) { // Stay under 2MB to be safe
                    localStorage.setItem('gemini_uploaded_images', imagesString);
                } else {
                    console.warn('Uploaded images too large for localStorage, not saving images');
                }
            } else {
                // If no images, clear the storage
                localStorage.removeItem('gemini_uploaded_images');
            }
        } catch (error) {
            console.error('Error saving images to localStorage:', error);
        }
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
        
        // Close any open lightbox when switching tabs to prevent context confusion
        if (lightbox && !lightbox.classList.contains('hidden')) {
            closeLightbox();
        }
        
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
            imageItem.dataset.historyIndex = index; // Store the index for reference
            
            // Create image
            const img = document.createElement('img');
            img.src = 'data:image/png;base64,' + item.data;
            img.alt = 'Generated image';
            
            // Add download button
            const downloadButton = createDownloadButton(item.data);
            
            // Add like button
            const likeButton = createLikeButton(item.data, item.timestamp);
            
            // Add click handler for fullscreen view
            imageItem.addEventListener('click', function(e) {
                if (e.target !== likeButton && !likeButton.contains(e.target) && 
                   e.target !== downloadButton && !downloadButton.contains(e.target)) {
                    openHistoryLightbox(index);
                }
            });
            
            imageItem.appendChild(img);
            imageItem.appendChild(downloadButton);
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
            imageItem.dataset.likedIndex = index; // Store the index for reference
            
            // Create image
            const img = document.createElement('img');
            img.src = 'data:image/png;base64,' + item.data;
            img.alt = 'Liked image';
            
            // Add download button
            const downloadButton = createDownloadButton(item.data);
            
            // Add like button (always in liked state)
            const likeButton = createLikeButton(item.data, item.timestamp, true);
            
            // Add click handler for fullscreen view
            imageItem.addEventListener('click', function(e) {
                if (e.target !== likeButton && !likeButton.contains(e.target) && 
                   e.target !== downloadButton && !downloadButton.contains(e.target)) {
                    openLikedLightbox(index);
                }
            });
            
            imageItem.appendChild(img);
            imageItem.appendChild(downloadButton);
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
        
        // Check if we're actually on the history tab before opening
        if (document.getElementById('history-tab').getAttribute('aria-selected') !== 'true') {
            // If not on history tab, switch to it first
            switchTab('history');
            // Small delay to ensure tab content is displayed
            setTimeout(() => {
                const historySources = generatedImagesHistory.map(item => item.data);
                openCustomLightbox(historySources, startIndex);
            }, 50);
        } else {
            const historySources = generatedImagesHistory.map(item => item.data);
            openCustomLightbox(historySources, startIndex);
        }
    }

    // Open lightbox for liked images
    function openLikedLightbox(startIndex) {
        if (likedImages.length === 0) return;
        
        // Check if we're actually on the liked tab before opening
        if (document.getElementById('liked-tab').getAttribute('aria-selected') !== 'true') {
            // If not on liked tab, switch to it first
            switchTab('liked');
            // Small delay to ensure tab content is displayed
            setTimeout(() => {
                const likedSources = likedImages.map(item => item.data);
                openCustomLightbox(likedSources, startIndex);
            }, 50);
        } else {
            const likedSources = likedImages.map(item => item.data);
            openCustomLightbox(likedSources, startIndex);
        }
    }

    // Open custom lightbox with specified image list and index
    function openCustomLightbox(imageSources, startIndex) {
        currentImageIndex = startIndex;
        
        // Store the active tab that was used to open the lightbox
        const activeTab = document.querySelector('[role="tab"][aria-selected="true"]').id.replace('-tab', '');
        lightbox.setAttribute('data-source-tab', activeTab);
        
        // Store the specific image sources for this lightbox session
        lightbox._imageSources = imageSources;
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
    
    // Function to open the lightbox for current generated images
    function openLightbox(imageIndex) {
        if (!generatedImages || generatedImages.length === 0) return;
        
        currentImageIndex = imageIndex;
        lightboxImg.src = 'data:image/png;base64,' + generatedImages[currentImageIndex];
        
        // Show the lightbox
        lightbox.classList.remove('hidden');
        setTimeout(() => lightbox.classList.add('active'), 10);
        
        // Update the counter
        updateCounter();
        
        // Update like button status
        updateLightboxLikeButton();
        
        // Setup the download button
        lightboxDownload.onclick = function() {
            downloadImage(generatedImages[currentImageIndex]);
        };
        
        // Setup the like button
        lightboxLike.onclick = function() {
            const isNowLiked = toggleLike(generatedImages[currentImageIndex]);
            updateLightboxLikeButton();
        };
    }
    
    // Function to update the like button appearance in the lightbox
    function updateLightboxLikeButton() {
        if (!generatedImages || currentImageIndex >= generatedImages.length) return;
        
        const isLiked = isImageLiked(generatedImages[currentImageIndex]);
        
        if (isLiked) {
            lightboxLike.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
                </svg>
            `;
            lightboxLike.classList.add('text-red-500');
            lightboxLike.classList.remove('text-white');
        } else {
            lightboxLike.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            `;
            lightboxLike.classList.remove('text-red-500');
            lightboxLike.classList.add('text-white');
        }
    }
    
    // Close lightbox
    function closeLightbox() {
        lightbox.classList.remove('active');
        setTimeout(() => {
            lightbox.classList.add('hidden');
            lightboxImg.src = '';
        }, 300);
    }
    
    closeLightboxBtn.addEventListener('click', closeLightbox);
    
    // Close lightbox on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) {
            closeLightbox();
        }
        
        // Previous image on left arrow
        if (e.key === 'ArrowLeft' && !lightbox.classList.contains('hidden')) {
            prevLightboxImage();
        }
        
        // Next image on right arrow
        if (e.key === 'ArrowRight' && !lightbox.classList.contains('hidden')) {
            nextLightboxImage();
        }
    });
    
    // Close lightbox when clicking outside the image
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // Add touch swipe functionality for mobile devices
    const lightboxContainer = document.getElementById('lightbox-container');
    let touchStartX = 0;
    let touchEndX = 0;
    
    // Touch event handlers for swipe
    lightboxContainer.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, false);
    
    lightboxContainer.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);
    
    // Detect swipe direction and change image
    function handleSwipe() {
        const swipeThreshold = 50; // Minimum distance for a swipe
        
        if (touchEndX < touchStartX - swipeThreshold) {
            // Swiped left - next image
            nextLightboxImage();
        }
        
        if (touchEndX > touchStartX + swipeThreshold) {
            // Swiped right - previous image
            prevLightboxImage();
        }
    }
    
    // Add back the lightbox navigation functions
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
        updateLightboxLikeButton();
    }
    
    function prevLightboxImage() {
        currentImageIndex = (currentImageIndex - 1 + generatedImages.length) % generatedImages.length;
        updateLightboxImage();
        updateCounter();
        updateLightboxLikeButton();
    }
    
    // Set up lightbox navigation event listeners
    nextImage.addEventListener('click', nextLightboxImage);
    prevImage.addEventListener('click', prevLightboxImage);
    
    // NEW FUNCTION: Generate a single image with retry logic
    async function generateSingleImage(apiKey, prompt, imageDataArray, retryCount = 0, maxRetries = 3) {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent";
        
        const parts = [{"text": prompt}];
        
        // Add all images if provided
        if (Array.isArray(imageDataArray) && imageDataArray.length > 0) {
            // Add each image in the array to the parts
            for (const imageData of imageDataArray) {
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
            }
        } 
        // Handle the case where a single image is passed directly
        else if (imageDataArray) {
            // Extract mime type and data
            const mimeType = imageDataArray.split(',')[0].split(':')[1].split(';')[0];
            const imageContent = imageDataArray.split(',')[1];
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
                        return generateSingleImage(apiKey, prompt, imageDataArray, retryCount + 1, maxRetries);
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
                    return generateSingleImage(apiKey, prompt, imageDataArray, retryCount + 1, maxRetries);
                }
            } else {
                // Other API error
                console.error(`API error (${response.status}):`, await response.text());
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return generateSingleImage(apiKey, prompt, imageDataArray, retryCount + 1, maxRetries);
                }
            }
        } catch (e) {
            console.error("Request error:", e);
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return generateSingleImage(apiKey, prompt, imageDataArray, retryCount + 1, maxRetries);
            }
        }
        
        // If we get here, all retries failed
        return {
            success: false, 
            error: "Failed to generate image after multiple attempts"
        };
    }

    // Function to process an individual image result and display it in a result box
    function processImage(result, index) {
        // Find the result box by index
        const resultBox = document.querySelectorAll('.result-box')[index];
        if (!resultBox) return;
        
        // Clear the box
        resultBox.innerHTML = '';
        resultBox.classList.remove('shimmer');
        resultBox.dataset.imageIndex = index.toString();
        
        // The image is from response.data, which is already base64
        const imageData = result.data;
        
        // Create image element
        const img = document.createElement('img');
        img.src = 'data:image/png;base64,' + imageData;
        img.alt = 'Generated image';
        img.className = 'w-full h-full object-cover';
        
        // Create overlay with buttons
        const overlay = document.createElement('div');
        overlay.className = 'image-overlay';
        
        // Create like button
        const likeButton = document.createElement('button');
        likeButton.className = 'action-btn like-btn' + (isImageLiked(imageData) ? ' liked' : '');
        likeButton.title = 'Like this image';
        likeButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
        `;
        
        // Create download button
        const downloadButton = document.createElement('button');
        downloadButton.className = 'action-btn download-btn';
        downloadButton.title = 'Download this image';
        downloadButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        // Add event listeners to buttons
        likeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isNowLiked = toggleLike(imageData, new Date().toISOString());
            if (isNowLiked) {
                likeButton.classList.add('liked');
            } else {
                likeButton.classList.remove('liked');
            }
        });
        
        downloadButton.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadImage(imageData);
        });
        
        // Add click handler to view the image in full screen
        resultBox.addEventListener('click', function(e) {
            if (e.target !== likeButton && !likeButton.contains(e.target) && 
                e.target !== downloadButton && !downloadButton.contains(e.target)) {
                openLightbox(index);
            }
        });
        
        // Add the buttons to the overlay
        overlay.appendChild(likeButton);
        overlay.appendChild(downloadButton);
        
        // Add the image and overlay to the box
        resultBox.appendChild(img);
        resultBox.appendChild(overlay);
        
        // Add this image to the list of generated images
        if (!generatedImages[index]) {
            generatedImages[index] = imageData;
        } else {
            generatedImages.splice(index, 1, imageData);
        }
        
        // Also add to history
        generatedImagesHistory.unshift({
            data: imageData,
            timestamp: new Date().toISOString(),
            prompt: promptTextarea.value
        });
        
        // Keep history at a reasonable size
        if (generatedImagesHistory.length > 100) {
            generatedImagesHistory.pop();
        }
    }

    // Function to generate multiple images
    async function generateImages(apiKey, prompt, imageDataArray, count = 4, boxElements = null) {
        // Update result boxes count if not provided
        if (!boxElements) {
            updateResultBoxesCount(count);
            boxElements = document.querySelectorAll('.result-box');
        }
        
        // Clear the generated images array
        generatedImages = [];
        
        // Show loading in all boxes
        boxElements.forEach((box, i) => {
            if (i < count) {
                box.innerHTML = `
                    <div class="shimmer-container">
                        <div class="shimmer-image"></div>
                        <div class="shimmer-text"></div>
                    </div>
                `;
                box.classList.add('shimmer');
            }
        });
        
        // Track completed image generations for each image
        const completedImages = new Array(count).fill(false);
        
        // Generate each image in parallel
        const promises = [];
        for (let i = 0; i < count; i++) {
            const promise = generateSingleImage(apiKey, prompt, imageDataArray)
                .then(result => {
                    completedImages[i] = true;
                    if (result.success) {
                        // Process successful image
                        processImage(result, i);
                    } else {
                        // Display error message for failed image
                        const box = boxElements[i];
                        if (box) {
                            box.classList.remove('shimmer');
                            
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
                            
                            box.innerHTML = '';
                            box.appendChild(errorDiv);
                        }
                    }
                })
                .catch(error => {
                    console.error(`Error generating image ${i}:`, error);
                    completedImages[i] = true;
                    
                    // Display error in the box
                    const box = boxElements[i];
                    if (box) {
                        box.classList.remove('shimmer');
                        box.innerHTML = `
                            <div class="flex items-center justify-center h-full">
                                <div class="text-red-500">Error generating image</div>
                            </div>
                        `;
                    }
                });
            
            promises.push(promise);
        }
        
        // Wait for all images to be generated
        await Promise.all(promises);
        
        // Enable the send button after all images are generated
        sendButton.disabled = false;
        sendButton.classList.remove('opacity-50');
        sendButton.textContent = 'Generate Images';
        
        return completedImages.every(done => done);
    }

    // Send button click handler - updated for dynamic image count
    sendButton.addEventListener('click', async function() {
        const apiKey = apiKeyInput.value.trim();
        const prompt = promptTextarea.value.trim();
        const imageCount = parseInt(imageCountInput.value);
        
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
        
        // Pass all uploaded images, not just the first one
        const imagesToSend = imageDataArray.length > 0 ? imageDataArray : null;
        
        try {
            // Generate images - each will display as it completes
            await generateImages(apiKey, prompt, imagesToSend, imageCount);
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
        // Check if we're actively editing the prompt textarea or API key field
        const activeElement = document.activeElement;
        const isPromptFocused = activeElement === promptTextarea;
        const isApiKeyFocused = activeElement === apiKeyInput;
        
        // If we're in the API key field, let the default paste behavior happen
        if (isApiKeyFocused) {
            return;
        }
        
        // Get clipboard content
        const items = e.clipboardData.items;
        let hasHandledContent = false;
        
        // First check for images in clipboard
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                handleImageFile(file);
                hasHandledContent = true;
                
                // If we're not directly focused in the textarea, prevent default
                // to avoid pasting image data as text
                if (!isPromptFocused) {
                    e.preventDefault();
                }
                break;
            }
        }
        
        // Then check for text content if no image was found and tab has focus
        if (!hasHandledContent && !isPromptFocused && document.hasFocus()) {
            // Check for text content
            for (let i = 0; i < items.length; i++) {
                if (items[i].type === 'text/plain') {
                    items[i].getAsString(function(text) {
                        if (text.trim()) {
                            // Focus the textarea and set its value to the pasted text
                            promptTextarea.focus();
                            promptTextarea.value = text;
                            
                            // Trigger the input event to resize the textarea
                            promptTextarea.dispatchEvent(new Event('input'));
                            
                            // Save the new prompt value
                            saveValues();
                        }
                    });
                    e.preventDefault();
                    break;
                }
            }
        }
    });

    // Remove previous drag and drop event listeners from dropZone
    dropZone.removeEventListener('dragenter', handleDragEnter);
    dropZone.removeEventListener('dragleave', handleDragLeave);
    dropZone.removeEventListener('dragover', handleDragOver);
    dropZone.removeEventListener('drop', handleDrop);

    // Remove drag and drop event listeners from textarea
    promptTextarea.removeEventListener('dragenter', handleDragEnter);
    promptTextarea.removeEventListener('dragleave', handleDragLeave);
    promptTextarea.removeEventListener('dragover', handleDragOver);
    promptTextarea.removeEventListener('drop', handleDrop);

    // Get the left column container
    const leftColumn = document.querySelector('.lg\\:w-1\\/3');
    
    // Add drag and drop event listeners to the entire left column
    leftColumn.addEventListener('dragenter', handleDragEnter);
    leftColumn.addEventListener('dragleave', handleDragLeave);
    leftColumn.addEventListener('dragover', handleDragOver);
    leftColumn.addEventListener('drop', handleDrop);

    // Update drag indicator to cover the entire left column
    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        leftColumn.classList.add('drag-active');
        
        // Show overlay over the entire left column
        if (!document.getElementById('left-column-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'left-column-overlay';
            overlay.className = 'absolute inset-0 bg-indigo-100 dark:bg-indigo-900 bg-opacity-70 dark:bg-opacity-70 rounded-md border-2 border-dashed border-indigo-500 flex items-center justify-center z-10';
            overlay.innerHTML = '<div class="text-indigo-600 dark:text-indigo-300 text-lg font-medium">Drop image here</div>';
            
            // Apply absolute positioning relative to the left column
            leftColumn.style.position = 'relative';
            leftColumn.appendChild(overlay);
        }
        
        document.body.classList.add('dragging-active');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            leftColumn.classList.remove('drag-active');
            
            // Remove the overlay
            const overlay = document.getElementById('left-column-overlay');
            if (overlay) {
                overlay.remove();
            }
            
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
        leftColumn.classList.remove('drag-active');
        
        // Remove the overlay
        const overlay = document.getElementById('left-column-overlay');
        if (overlay) {
            overlay.remove();
        }
        
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
            
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'img-wrapper';
            imgWrapper.style.width = '100%';
            imgWrapper.style.height = '100%';
            imgWrapper.style.display = 'flex';
            imgWrapper.style.alignItems = 'center';
            imgWrapper.style.justifyContent = 'center';
            
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
            
            imgWrapper.appendChild(img);
            container.appendChild(imgWrapper);
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

    // Image count control functionality
    decreaseCountBtn.addEventListener('click', function() {
        let currentValue = parseInt(imageCountInput.value);
        if (currentValue > parseInt(imageCountInput.min)) {
            imageCountInput.value = currentValue - 1;
            // Save the count value
            localStorage.setItem('gemini_image_count', imageCountInput.value);
            // Adjust the result boxes if needed
            updateResultBoxesCount(imageCountInput.value);
        }
    });
    
    increaseCountBtn.addEventListener('click', function() {
        let currentValue = parseInt(imageCountInput.value);
        if (currentValue < parseInt(imageCountInput.max)) {
            imageCountInput.value = currentValue + 1;
            // Save the count value
            localStorage.setItem('gemini_image_count', imageCountInput.value);
            // Adjust the result boxes if needed
            updateResultBoxesCount(imageCountInput.value);
        }
    });
    
    imageCountInput.addEventListener('change', function() {
        // Ensure value is within bounds
        let value = parseInt(imageCountInput.value);
        const min = parseInt(imageCountInput.min);
        const max = parseInt(imageCountInput.max);
        
        if (isNaN(value) || value < min) {
            imageCountInput.value = min;
            value = min;
        } else if (value > max) {
            imageCountInput.value = max;
            value = max;
        }
        
        // Save the count value
        localStorage.setItem('gemini_image_count', value);
        
        // Adjust the result boxes if needed
        updateResultBoxesCount(value);
    });
    
    // Function to update the number of result boxes based on the image count
    function updateResultBoxesCount(count) {
        count = parseInt(count);
        
        // Get current result boxes
        const currentBoxes = Array.from(resultsContainer.querySelectorAll('.result-box'));
        const currentCount = currentBoxes.length;
        
        if (count > currentCount) {
            // Add more boxes
            for (let i = currentCount; i < count; i++) {
                const newBox = document.createElement('div');
                newBox.className = 'result-box rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 min-h-[200px]';
                resultsContainer.appendChild(newBox);
            }
        } else if (count < currentCount) {
            // Remove extra boxes
            for (let i = currentCount - 1; i >= count; i--) {
                if (currentBoxes[i]) {
                    currentBoxes[i].remove();
                }
            }
        }
        
        // Update the grid layout class based on count
        resultsContainer.className = resultsContainer.className.replace(/\sitems-\d+/g, '');
        resultsContainer.classList.add(`items-${count}`);
        
        // Return the updated NodeList of result boxes
        return document.querySelectorAll('#results .result-box');
    }

    // Create a download button for an image
    function createDownloadButton(imageData) {
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.title = 'Download image';
        
        downloadBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        downloadBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            downloadImage(imageData);
        });
        
        return downloadBtn;
    }
    
    // Function to download an image
    function downloadImage(imageData) {
        // Create a temporary anchor element
        const a = document.createElement('a');
        
        // Set the download attribute with a filename
        a.download = `gemini-image-${new Date().getTime()}.png`;
        
        // Set the href to the image data
        a.href = 'data:image/png;base64,' + imageData;
        
        // Append to the body, click, and remove
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Add event handler to ensure lightbox matches current tab context when reopening
    document.addEventListener('click', function(e) {
        // Check if clicked element is an image in a result box and we're in the generate tab
        if (document.getElementById('generate-tab').getAttribute('aria-selected') === 'true') {
            const resultBoxImg = e.target.closest('.result-box img');
            if (resultBoxImg) {
                const resultBox = resultBoxImg.closest('.result-box');
                if (resultBox) {
                    // Find the index of this result box
                    const allResultBoxes = Array.from(document.querySelectorAll('.result-box'));
                    const index = allResultBoxes.indexOf(resultBox);
                    if (index !== -1 && generatedImages && generatedImages.length > index) {
                        openLightbox(index);
                    }
                }
            }
        }
        // Check if clicked element is an image in the history tab
        else if (document.getElementById('history-tab').getAttribute('aria-selected') === 'true') {
            const historyItem = e.target.closest('.history-item');
            if (historyItem && !e.target.closest('.like-btn') && !e.target.closest('.download-btn')) {
                const index = parseInt(historyItem.dataset.historyIndex || '0');
                openHistoryLightbox(index);
            }
        }
        // Check if clicked element is an image in the liked tab
        else if (document.getElementById('liked-tab').getAttribute('aria-selected') === 'true') {
            const likedItem = e.target.closest('.liked-item');
            if (likedItem && !e.target.closest('.like-btn') && !e.target.closest('.download-btn')) {
                const index = parseInt(likedItem.dataset.likedIndex || '0');
                openLikedLightbox(index);
            }
        }
    });
}); 