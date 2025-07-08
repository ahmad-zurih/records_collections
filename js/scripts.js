const recordsPerPage = 10;
let currentPage = 1;
let allRecords = []; // Store all records globally for routing

// --- VIEW & NAVIGATION MANAGEMENT ---

/**
 * Updates the view based on the current URL hash. This is our "router".
 */
function handleLocation() {
    const hash = window.location.hash;

    if (hash && hash.startsWith('#')) {
        const slug = hash.substring(1);
        const record = allRecords.find(r => r.slug === slug);
        if (record) {
            renderDetailsView(record);
        } else {
            renderMainView();
        }
    } else {
        renderMainView();
    }
}

/**
 * Renders the main search view.
 */
function renderMainView() {
    document.getElementById('details-view').style.display = 'none';
    document.getElementById('main-view').style.display = 'block';
    if (document.getElementById('results').innerHTML === '') {
        searchRecords();
    }
}

/**
 * Renders the album details view (fetches Wiki content and updates DOM).
 * @param {object} record - The record object to display.
 */
async function renderDetailsView(record) {
    const mainView = document.getElementById('main-view');
    const detailsView = document.getElementById('details-view');
    
    mainView.style.display = 'none';
    detailsView.style.display = 'block';
    detailsView.innerHTML = '<h2><span class="loading-animation"></span> Loading Album Details...</h2>';

    const content = await getWikipediaContent(record.title, record.artist);

    let introHtml = '<p>No description found. The Wikipedia page might have an unusual format or could not be found.</p>';
    if (content && content.intro) {
        introHtml = content.intro;
    }

    let tracklistHtml = '<p>No track listing found. The Wikipedia page might have an unusual format or this section may be missing.</p>';
    if (content && content.tracklist) {
        tracklistHtml = content.tracklist;
    }

    detailsView.innerHTML = `
        <button class="back-button" onclick="navigateHome()">← Back to Search</button>
        <div class="details-header">
            <img src="${record.image}" alt="${record.title}">
            <div class="details-header-text">
                <h2>${record.title}</h2>
                <h3>by ${record.artist}</h3>
            </div>
        </div>
        <div class="details-content">
            <div class="intro-description">
                <h3>Introduction</h3>
                ${introHtml}
            </div>
            <div class="track-listing">
                <h3>Track Listing</h3>
                ${tracklistHtml}
            </div>
        </div>
    `;
}

/**
 * Navigates to the details view, updating history.
 * @param {object} record - The record object to navigate to.
 */
function navigateToDetails(record) {
    const slug = record.slug;
    const state = { view: 'details', slug: slug };
    history.pushState(state, '', `#${slug}`);
    renderDetailsView(record);
}

/**
 * Navigates to the main/home view, updating history.
 */
function navigateHome() {
    const state = { view: 'main' };
    history.pushState(state, '', window.location.pathname);
    renderMainView();
}


// --- WIKIPEDIA API & PARSING (Updated to fix links) ---
async function getWikipediaContent(albumTitle, artistName) {
    try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(albumTitle + " " + artistName)}&srlimit=1&format=json&origin=*`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();
        
        if (!searchData.query.search || searchData.query.search.length === 0) return null;
        
        const pageTitle = searchData.query.search[0].title;
        const contentUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json&origin=*`;
        const contentResponse = await fetch(contentUrl);
        const contentData = await contentResponse.json();
        const htmlContent = contentData.parse.text['*'];

        const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
        const contentRoot = doc.querySelector('.mw-parser-output');
        if (!contentRoot) return null;

        // *** NEW: Fix all relative Wikipedia links ***
        contentRoot.querySelectorAll('a[href^="/wiki/"]').forEach(link => {
            const href = link.getAttribute('href');
            link.setAttribute('href', `https://en.wikipedia.org${href}`);
            link.setAttribute('target', '_blank'); // Open in a new tab
            link.setAttribute('rel', 'noopener noreferrer'); // For security
        });

        contentRoot.querySelectorAll('.mw-editsection, sup.reference, .navbox').forEach(el => el.remove());

        let intro = '';
        for (const child of contentRoot.children) {
            if (child.tagName === 'P' && child.textContent.trim().length > 10) {
                intro = child.outerHTML;
                break;
            }
        }
        
        const tracklistHeading = doc.getElementById('Track_listing') || doc.getElementById('Track_list');
        let tracklistHtml = '';
        if (tracklistHeading) {
            let currentNode = tracklistHeading.parentElement.nextElementSibling;
            while (currentNode && !['H2', 'H3'].includes(currentNode.tagName)) {
                tracklistHtml += currentNode.outerHTML;
                currentNode = currentNode.nextElementSibling;
            }
        }
        
        return { intro: intro || null, tracklist: tracklistHtml || null };
    } catch (error) {
        console.error("Failed to fetch or parse Wikipedia content:", error);
        return null;
    }
}


// --- CORE APP LOGIC (Same as before) ---

function searchRecords() {
    currentPage = 1;
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = filterRecords(query);
    displayPaginatedResults(filtered);
}

function filterRecords(query) {
    const searchTerms = query.split(' ').filter(term => term.length > 0);
    if (searchTerms.length === 0) return [...allRecords];

    return allRecords.filter(record => {
        const recordText = `${record.artist} ${record.title}`.toLowerCase();
        return searchTerms.every(term => recordText.includes(term));
    });
}

function displayPaginatedResults(filteredRecords) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    const resultsContainer = document.createElement('div');
    resultsContainer.classList.add('results-container');
    resultsDiv.appendChild(resultsContainer);

    const totalRecords = filteredRecords.length;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const paginatedRecords = filteredRecords.slice(startIndex, startIndex + recordsPerPage);

    if (paginatedRecords.length === 0) {
        resultsContainer.innerHTML = '<p>No results found</p>';
    } else {
        paginatedRecords.forEach(record => {
            const recordDiv = document.createElement('div');
            recordDiv.className = 'record';
            recordDiv.innerHTML = `
                <img src="${record.image}" alt="${record.title}">
                <h2>${record.title}</h2>
                <p>by ${record.artist}</p>
            `;
            recordDiv.addEventListener('click', () => navigateToDetails(record));
            resultsContainer.appendChild(recordDiv);
        });
    }

    const resultCount = document.createElement('p');
    resultCount.className = 'result-count';
    resultCount.textContent = `${totalRecords} result(s) found`;
    resultsDiv.appendChild(resultCount);

    if (totalPages > 1) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';
        // Pagination logic here
        resultsDiv.appendChild(paginationDiv);
    }
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    searchRecords();
}

// --- INITIALIZATION ---

async function initializeApp() {
    const recordsData = await fetch('data/records.json').then(res => res.json());
    recordsData.forEach(artist => {
        artist.albums.forEach(album => {
            const record = { ...album, artist: artist.name };
            record.slug = `${artist.name} ${album.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            allRecords.push(record);
        });
    });
    
    allRecords.sort((a, b) => a.slug.localeCompare(b.slug));
    
    document.getElementById('search-input').addEventListener('keydown', e => e.key === 'Enter' && searchRecords());
    window.addEventListener('popstate', handleLocation);
    
    handleLocation();
}

initializeApp();