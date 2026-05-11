document.addEventListener("DOMContentLoaded", function () {
  const isHome = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('Index.html');
  if (!isHome) return;

  const welcomeSection = document.getElementById("welcome-section");
  const categoriesSection = document.getElementById("categories-section");
  const videoSection = document.getElementById("video-section");
  const videoPlayer = document.getElementById("video-player");
  const videoDesc = document.getElementById("video-description");
  const searchForm = document.querySelector('.search-form');

  // Update welcome message after user sync
  syncUserFromServer().then(() => {
    const user = getClientUser();
    if (user) {
      welcomeSection.innerHTML = `<p><strong>Welcome, ${user.firstname || user.username}!</strong><br>
      You are logged in as <b>${user.username}</b> (${user.email})</p>`;
      if (!localStorage.getItem('welcomeNotified')) {
        addNotification(`Welcome, ${user.firstname || user.username}! Glad to have you on GlenHub.`);
        localStorage.setItem('welcomeNotified', '1');
      }
    } else {
      welcomeSection.innerHTML = `<p><strong>Welcome,</strong><br>
      to <em>the GLEN global market</em>, where you get stress free businesses.<br>
      What are you buying from us today?</p>`;
    }

    // Show video for merchants/admins
    if (user && (user.role === 'admin' || user.role === 'merchant')) {
      videoSection.style.display = 'block';
      
      // Show default YouTube video
      const iframeDisplay = document.getElementById('video-display-iframe');
      const localDisplay = document.getElementById('video-display-local');
      if (iframeDisplay) {
        iframeDisplay.style.display = 'block';
        videoPlayer.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ'; // Example video
      }
      if (localDisplay) localDisplay.style.display = 'none';
      videoDesc.textContent = 'Check out our latest featured products and special offers!';

      // Video upload functionality
      const uploadBtn = document.getElementById('upload-video-btn');
      const fileInput = document.getElementById('video-file-input');
      const uploadStatus = document.getElementById('upload-status');

      if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => {
          fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
          if (!validTypes.includes(file.type)) {
            uploadStatus.textContent = '❌ Invalid file type. Please upload MP4, WebM, OGG, or MOV.';
            uploadStatus.style.color = '#d32f2f';
            return;
          }

          if (file.size > 500 * 1024 * 1024) { // 500MB limit
            uploadStatus.textContent = '❌ File too large. Maximum 500MB allowed.';
            uploadStatus.style.color = '#d32f2f';
            return;
          }

          uploadStatus.textContent = '⏳ Uploading...';
          uploadStatus.style.color = '#2196f3';

          const formData = new FormData();
          formData.append('video', file);

          fetch('/upload-video', {
            method: 'POST',
            body: formData
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              uploadStatus.textContent = '✅ Video uploaded successfully!';
              uploadStatus.style.color = '#4caf50';
              
              // Switch to local video player
              const iframeDisplay = document.getElementById('video-display-iframe');
              const localDisplay = document.getElementById('video-display-local');
              const videoSource = document.getElementById('video-source');
              const videoPlayerLocal = document.getElementById('video-player-local');

              if (iframeDisplay) iframeDisplay.style.display = 'none';
              if (localDisplay) localDisplay.style.display = 'block';
              
              if (videoSource) {
                videoSource.src = data.videoUrl;
                videoSource.type = 'video/' + file.name.split('.').pop();
              }
              if (videoPlayerLocal) {
                videoPlayerLocal.load();
              }
              
              videoDesc.textContent = `Uploaded: ${file.name}`;

              // Reset file input
              fileInput.value = '';
            } else {
              uploadStatus.textContent = '❌ Upload failed: ' + (data.message || 'Unknown error');
              uploadStatus.style.color = '#d32f2f';
            }
          })
          .catch(err => {
            console.error('Upload error:', err);
            uploadStatus.textContent = '❌ Upload error: ' + err.message;
            uploadStatus.style.color = '#d32f2f';
          });
        });
      }
    }
  });

  // Load products for categories
  fetch('/products').then(res => res.json()).then(data => {
    if (data.success && Array.isArray(data.products) && data.products.length > 0) {
      const categories = [...new Set(data.products.map(p => p.category).filter(Boolean))];
      if (categories.length > 0) {
        categoriesSection.innerHTML = categories.map(cat => `
          <div class="category-box">
            <h3>${cat}</h3>
            <a href="department.html?cat=${encodeURIComponent(cat)}" class="more">Browse</a>
          </div>
        `).join('');
        initCategoryCarousel();
      } else {
        categoriesSection.innerHTML = '<p>No categories found.</p>';
      }
    } else {
      categoriesSection.innerHTML = '<p>No products available yet. Check back soon!</p>';
    }
  }).catch(err => {
    console.error('Failed to load products:', err);
    categoriesSection.innerHTML = '<p>Error loading products. Please try again later.</p>';
  });

  // Search logic
  if (searchForm) {
    if (!document.getElementById('search-btn')) {
      const btn = document.createElement('button');
      btn.type = 'submit';
      btn.id = 'search-btn';
      btn.textContent = 'Search';
      btn.style.marginLeft = '8px';
      btn.style.background = '#f44336';
      btn.style.color = '#fff';
      btn.style.border = 'none';
      btn.style.borderRadius = '20px';
      btn.style.padding = '6px 16px';
      btn.style.fontWeight = 'bold';
      btn.style.cursor = 'pointer';
      searchForm.appendChild(btn);
    }
    searchForm.onsubmit = function (e) {
      e.preventDefault();
      const q = document.getElementById('searchInput').value.trim().toLowerCase();
      if (!q) return;
      localStorage.setItem('searchQuery', q);
      window.location.href = 'search-results.html';
    };
  }

  // Carousel scroll functionality
  function initCategoryCarousel() {
    const carousel = document.getElementById('categories-section');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    if (!carousel || !prevBtn || !nextBtn) return;

    const scrollAmount = 300;

    prevBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    function updateButtonStates() {
      const isAtStart = carousel.scrollLeft <= 0;
      const isAtEnd = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 5;
      prevBtn.disabled = isAtStart;
      nextBtn.disabled = isAtEnd;
    }

    carousel.addEventListener('scroll', updateButtonStates);
    updateButtonStates();
  }
});