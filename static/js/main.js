document.addEventListener('DOMContentLoaded', () => {
    // State management
    const state = {
        allEntries: [],
        filteredEntries: [],
        currentFilter: 'all',
        searchQuery: '',
        lastUpdated: null
    };

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const statCards = document.querySelectorAll('.stat-card');
    const timelineContainer = document.getElementById('feed-timeline');

    // State Containers
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const emptyState = document.getElementById('empty-state');
    const lastUpdatedTime = document.getElementById('last-updated-time');
    const retryBtn = document.getElementById('retry-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    // Stats Counters
    const statTotal = document.getElementById('stat-total');
    const statFeatures = document.getElementById('stat-features');
    const statIssues = document.getElementById('stat-issues');
    const statChanges = document.getElementById('stat-changes');

    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const previewBadge = document.getElementById('preview-badge');
    const previewDate = document.getElementById('preview-date');
    const previewText = document.getElementById('preview-text');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const tweetWarning = document.getElementById('tweet-warning');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const postTweetBtn = document.getElementById('post-tweet-btn');
    const templateButtons = document.querySelectorAll('.btn-template');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Modal state variables
    let selectedUpdate = null;
    let currentTemplateStyle = 'casual';

    // Initialize Event Listeners
    function init() {
        refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
        if (retryBtn) retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
        if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);

        // Filter tabs
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetType = tab.getAttribute('data-type');
                setActiveFilterTab(targetType);
            });
        });

        // Stat cards click behavior
        statCards.forEach(card => {
            card.addEventListener('click', () => {
                const filterType = card.getAttribute('data-filter');
                let mappedType = 'all';
                if (filterType === 'feature') mappedType = 'Feature';
                if (filterType === 'issue') mappedType = 'Issue';
                if (filterType === 'change') mappedType = 'Change';
                
                // Active class on stat cards
                statCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                setActiveFilterTab(mappedType);
            });
        });

        // Search inputs
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase().trim();
            toggleClearButton();
            applyFiltersAndSearch();
        });

        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            state.searchQuery = '';
            toggleClearButton();
            applyFiltersAndSearch();
            searchInput.focus();
        });

        // Modal close
        closeModalBtn.addEventListener('click', closeTweetModal);
        tweetModal.addEventListener('click', (e) => {
            if (e.target === tweetModal) closeTweetModal();
        });

        tweetTextarea.addEventListener('input', updateCharCounter);

        templateButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                templateButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTemplateStyle = btn.getAttribute('data-template');
                generateTweetFromTemplate();
            });
        });

        copyTweetBtn.addEventListener('click', copyTweetToClipboard);
        postTweetBtn.addEventListener('click', postTweetToTwitter);

        // First load
        fetchReleaseNotes(false);
    }

    // Fetch Release Notes
    async function fetchReleaseNotes(forceRefresh = false) {
        showLoading();
        refreshBtn.disabled = true;
        refreshIcon.classList.add('spin');

        try {
            const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                state.allEntries = data.releases || [];
                state.lastUpdated = data.last_updated;
                
                updateLastUpdatedTime(data.last_updated);
                updateStats();
                applyFiltersAndSearch();
                showContent();
                if (forceRefresh) {
                    showToast('Feed updated successfully!');
                }
            } else {
                throw new Error(data.error || 'Failed to fetch release notes.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showError(error.message);
        } finally {
            refreshBtn.disabled = false;
            refreshIcon.classList.remove('spin');
        }
    }

    // UI State Toggles
    function showLoading() {
        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        timelineContainer.classList.add('hidden');
        emptyState.classList.add('hidden');
    }

    function showContent() {
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        timelineContainer.classList.remove('hidden');
    }

    function showError(msg) {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        errorMessage.textContent = msg;
        timelineContainer.classList.add('hidden');
        emptyState.classList.add('hidden');
    }

    // Format & Show Last Updated Time
    function updateLastUpdatedTime(timestamp) {
        if (!timestamp) return;
        const date = new Date(timestamp * 1000);
        lastUpdatedTime.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString();
    }

    // Toggle Search Clear Icon
    function toggleClearButton() {
        searchClearBtn.style.display = state.searchQuery.length > 0 ? 'block' : 'none';
    }

    // Update Counter cards at the top
    function updateStats() {
        const total = state.allEntries.length;
        const features = state.allEntries.filter(e => e.type === 'Feature').length;
        const issues = state.allEntries.filter(e => e.type === 'Issue').length;
        const changes = state.allEntries.filter(e => e.type === 'Change').length;

        animateCounter(statTotal, total);
        animateCounter(statFeatures, features);
        animateCounter(statIssues, issues);
        animateCounter(statChanges, changes);
    }

    // Nice rolling digits
    function animateCounter(element, targetValue) {
        let startValue = parseInt(element.textContent) || 0;
        if (startValue === targetValue) {
            element.textContent = targetValue;
            return;
        }
        const duration = 800;
        const startTime = performance.now();

        function updateNumber(currentTime) {
            const elapsedTime = currentTime - startTime;
            if (elapsedTime >= duration) {
                element.textContent = targetValue;
                return;
            }
            const progress = elapsedTime / duration;
            const easeProgress = easeOutQuad(progress);
            const value = Math.round(startValue + easeProgress * (targetValue - startValue));
            element.textContent = value;
            requestAnimationFrame(updateNumber);
        }
        requestAnimationFrame(updateNumber);
    }

    function easeOutQuad(x) {
        return 1 - (1 - x) * (1 - x);
    }

    // Filter Navigation Handler
    function setActiveFilterTab(type) {
        state.currentFilter = type;
        
        filterTabs.forEach(tab => {
            if (tab.getAttribute('data-type') === type) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Also update stat card active state if they match
        statCards.forEach(card => {
            const filter = card.getAttribute('data-filter');
            const mapped = filter === 'feature' ? 'Feature' : (filter === 'issue' ? 'Issue' : (filter === 'change' ? 'Change' : 'all'));
            if (mapped === type && type !== 'all') {
                card.classList.add('active');
            } else if (type === 'all' && filter === 'all') {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        applyFiltersAndSearch();
    }

    // Apply Filter and Search combined
    function applyFiltersAndSearch() {
        let result = state.allEntries;

        // Filter by type
        if (state.currentFilter !== 'all') {
            result = result.filter(entry => entry.type.toLowerCase() === state.currentFilter.toLowerCase());
        }

        // Filter by search text
        if (state.searchQuery) {
            result = result.filter(entry => {
                const dateMatch = entry.date.toLowerCase().includes(state.searchQuery);
                const typeMatch = entry.type.toLowerCase().includes(state.searchQuery);
                const contentMatch = entry.text.toLowerCase().includes(state.searchQuery);
                return dateMatch || typeMatch || contentMatch;
            });
        }

        state.filteredEntries = result;
        renderTimeline();
    }

    // Reset all filter & search states
    function resetFilters() {
        searchInput.value = '';
        state.searchQuery = '';
        toggleClearButton();
        setActiveFilterTab('all');
    }

    // Render Timeline Lists
    function renderTimeline() {
        timelineContainer.innerHTML = '';
        
        if (state.filteredEntries.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        // Group items by date
        const grouped = {};
        state.filteredEntries.forEach(entry => {
            if (!grouped[entry.date]) {
                grouped[entry.date] = [];
            }
            grouped[entry.date].push(entry);
        });

        // Generate DOM for each group
        let delayIdx = 0;
        Object.keys(grouped).forEach(date => {
            const groupEl = document.createElement('div');
            groupEl.className = 'timeline-group';
            groupEl.style.animationDelay = `${delayIdx * 0.05}s`;
            delayIdx++;

            const headerEl = document.createElement('div');
            headerEl.className = 'timeline-date-header';
            
            const nodeEl = document.createElement('span');
            nodeEl.className = 'timeline-date-node';
            
            const textEl = document.createElement('h3');
            textEl.className = 'timeline-date-text';
            textEl.textContent = date;

            headerEl.appendChild(nodeEl);
            headerEl.appendChild(textEl);
            groupEl.appendChild(headerEl);

            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'timeline-items';

            grouped[date].forEach(item => {
                const cardEl = document.createElement('article');
                cardEl.className = 'update-card';
                cardEl.setAttribute('data-type', item.type);

                const header = document.createElement('div');
                header.className = 'card-header';

                const badge = document.createElement('span');
                const lowerType = item.type.toLowerCase();
                badge.className = `badge ${lowerType}`;
                badge.textContent = item.type;

                const links = document.createElement('div');
                links.className = 'card-links';

                const originalLink = document.createElement('a');
                originalLink.className = 'card-link';
                originalLink.href = item.link;
                originalLink.target = '_blank';
                originalLink.title = 'View release on Google Cloud docs';
                originalLink.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i>';

                links.appendChild(originalLink);
                header.appendChild(badge);
                header.appendChild(links);

                const body = document.createElement('div');
                body.className = 'card-body';
                body.innerHTML = item.html;

                const cardFooter = document.createElement('div');
                cardFooter.className = 'card-footer';

                const tweetBtn = document.createElement('button');
                tweetBtn.className = 'btn btn-card-action';
                tweetBtn.innerHTML = '<i class="fa-brands fa-x-twitter"></i> Tweet';
                tweetBtn.addEventListener('click', () => openTweetModal(item));

                cardFooter.appendChild(tweetBtn);

                cardEl.appendChild(header);
                cardEl.appendChild(body);
                cardEl.appendChild(cardFooter);
                
                itemsContainer.appendChild(cardEl);
            });

            groupEl.appendChild(itemsContainer);
            timelineContainer.appendChild(groupEl);
        });
    }

    // Tweet Modal Handlers
    function openTweetModal(item) {
        selectedUpdate = item;
        
        previewBadge.className = `badge ${item.type.toLowerCase()}`;
        previewBadge.textContent = item.type;
        previewDate.textContent = item.date;
        previewText.textContent = item.text;
        
        templateButtons.forEach(btn => {
            if (btn.getAttribute('data-template') === 'casual') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        currentTemplateStyle = 'casual';

        generateTweetFromTemplate();
        tweetModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        tweetTextarea.focus();
    }

    function closeTweetModal() {
        tweetModal.classList.remove('active');
        document.body.style.overflow = '';
        selectedUpdate = null;
    }

    function generateTweetFromTemplate() {
        if (!selectedUpdate) return;
        
        const type = selectedUpdate.type;
        const date = selectedUpdate.date;
        const link = selectedUpdate.link;
        // Clean up newlines & consecutive spaces in text
        const text = selectedUpdate.text.replace(/\s+/g, ' ');

        let tweetText = '';
        const linkLength = 23; // Twitter counts all URLs as 23 characters

        if (currentTemplateStyle === 'casual') {
            const prefix = `🚀 BigQuery ${type} (${date}): `;
            const suffix = `\n\nRead more: ${link}\n#BigQuery #GoogleCloud`;
            
            const staticLength = prefix.length + linkLength + (suffix.length - link.length);
            const maxTextLength = 280 - staticLength;
            
            let processedText = text;
            if (text.length > maxTextLength) {
                processedText = text.substring(0, maxTextLength - 3) + '...';
            }
            
            tweetText = `${prefix}${processedText}${suffix}`;
            
        } else if (currentTemplateStyle === 'detailed') {
            const prefix = `📢 Google Cloud BigQuery released a new ${type} on ${date}:\n\n`;
            const suffix = `\n\nFull details: ${link}`;
            
            const staticLength = prefix.length + linkLength + (suffix.length - link.length);
            const maxTextLength = 280 - staticLength;
            
            let processedText = text;
            if (text.length > maxTextLength) {
                processedText = text.substring(0, maxTextLength - 3) + '...';
            }
            
            tweetText = `${prefix}${processedText}${suffix}`;
            
        } else if (currentTemplateStyle === 'hype') {
            const prefix = `🔥 New in #BigQuery: ${type} update!\n\n👉 `;
            const suffix = `\n\nDetails: ${link} #GoogleCloud #DataEngineering`;
            
            const staticLength = prefix.length + linkLength + (suffix.length - link.length);
            const maxTextLength = 280 - staticLength;
            
            let processedText = text;
            if (text.length > maxTextLength) {
                processedText = text.substring(0, maxTextLength - 3) + '...';
            }
            
            tweetText = `${prefix}${processedText}${suffix}`;
        }

        tweetTextarea.value = tweetText;
        updateCharCounter();
    }

    function updateCharCounter() {
        const text = tweetTextarea.value;
        let displayLength = text.length;

        // Roughly simulate Twitter's link wrapping
        if (selectedUpdate && text.includes(selectedUpdate.link)) {
            displayLength = text.length - selectedUpdate.link.length + 23;
        }
        
        charCounter.textContent = `${displayLength} / 280`;

        if (displayLength > 280) {
            charCounter.className = 'char-counter danger';
            tweetWarning.classList.remove('hidden');
        } else if (displayLength > 255) {
            charCounter.className = 'char-counter warning';
            tweetWarning.classList.add('hidden');
        } else {
            charCounter.className = 'char-counter';
            tweetWarning.classList.add('hidden');
        }
    }

    async function copyTweetToClipboard() {
        const text = tweetTextarea.value;
        try {
            await navigator.clipboard.writeText(text);
            showToast('Tweet copied to clipboard!');
        } catch (err) {
            // Fallback for older browsers or permission denied
            tweetTextarea.select();
            document.execCommand('copy');
            showToast('Tweet copied to clipboard!');
        }
    }

    function postTweetToTwitter() {
        const text = tweetTextarea.value;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
    }

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        
        // Force reflow
        void toast.offsetWidth;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 2500);
    }

    // Run the app initializer
    init();
});
