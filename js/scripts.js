const recordsPerPage = 10;
let currentPage = 1;
let currentSort = 'artist';
let allRecords = []; // Store all records globally for routing
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect width='100%25' height='100%25' fill='%231f1f25'/%3E%3Ctext x='50%25' y='50%25' font-size='110' fill='%23ff8c00' text-anchor='middle' dominant-baseline='central'%3E%E2%99%AB%3C/text%3E%3C/svg%3E";
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}


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

    const wikiLinkHtml = content && content.url
        ? `<a class="wiki-link" href="${content.url}" target="_blank" rel="noopener noreferrer">Read more on Wikipedia ↗</a>`
        : '';

    detailsView.innerHTML = `
        <button class="back-button" onclick="navigateHome()">← Back to Search</button>
        <div class="details-header">
            <img src="${record.image}" alt="${record.title}" loading="lazy" onerror="this.onerror=null;this.src=PLACEHOLDER_IMG;">
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
        ${wikiLinkHtml}
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


// --- WIKIPEDIA API & PARSING ---
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

        contentRoot.querySelectorAll('a').forEach(link => {
            link.replaceWith(...link.childNodes);
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
        
        const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
        return { intro: intro || null, tracklist: tracklistHtml || null, url: wikiUrl };
    } catch (error) {
        console.error("Failed to fetch or parse Wikipedia content:", error);
        return null;
    }
}


// --- CORE APP LOGIC ---

function sortRecords(records) {
    const sorted = [...records];
    switch (currentSort) {
        case 'title':
            sorted.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'recent':
            sorted.sort((a, b) => b.order - a.order);
            break;
        case 'artist':
        default:
            sorted.sort((a, b) =>
                a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
            break;
    }
    return sorted;
}

function searchRecords() {
    currentPage = 1;
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = sortRecords(filterRecords(query));
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
                <img src="${record.image}" alt="${record.title}" loading="lazy" onerror="this.onerror=null;this.src=PLACEHOLDER_IMG;">
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

    // *** NEW, ADVANCED PAGINATION LOGIC ***
    if (totalPages > 1) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';

        // Previous Button
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.disabled = currentPage === 1;
        prevButton.onclick = () => {
            currentPage--;
            displayPaginatedResults(filteredRecords);
        };
        paginationDiv.appendChild(prevButton);

        // Page Number Buttons
        const pageWindow = 2; // How many pages to show around the current page
        const pagesToShow = new Set();
        pagesToShow.add(1); // Always show page 1
        pagesToShow.add(totalPages); // Always show the last page

        for (let i = currentPage - pageWindow; i <= currentPage + pageWindow; i++) {
            if (i > 0 && i <= totalPages) {
                pagesToShow.add(i);
            }
        }
        
        const sortedPages = Array.from(pagesToShow).sort((a, b) => a - b);
        let lastPage = 0;
        
        sortedPages.forEach(page => {
            if (lastPage > 0 && page > lastPage + 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.margin = '0 10px';
                paginationDiv.appendChild(ellipsis);
            }

            const pageButton = document.createElement('button');
            pageButton.textContent = page;
            if (page === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.onclick = () => {
                currentPage = page;
                displayPaginatedResults(filteredRecords);
            };
            paginationDiv.appendChild(pageButton);
            lastPage = page;
        });

        // Next Button
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.disabled = currentPage === totalPages;
        nextButton.onclick = () => {
            currentPage++;
            displayPaginatedResults(filteredRecords);
        };
        paginationDiv.appendChild(nextButton);
        
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
    let order = 0;
    recordsData.forEach(artist => {
        artist.albums.forEach(album => {
            const record = { ...album, artist: artist.name };
            record.slug = `${artist.name} ${album.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            record.order = order++;
            allRecords.push(record);
        });
    });
    
    
    document.getElementById('search-input').addEventListener('keydown', e => e.key === 'Enter' && searchRecords());
    document.getElementById('search-input').addEventListener('input', debounce(searchRecords, 300));
        document.getElementById('search-button').addEventListener('click', searchRecords);
    document.getElementById('clear-button').addEventListener('click', clearSearch);
    document.getElementById('sort-select').addEventListener('change', (e) => {
        currentSort = e.target.value;
        searchRecords();
    });
    
    window.addEventListener('popstate', (e) => {
        if (!e.state || e.state.view === 'main') {
            renderMainView();
            // When going back, we need to restore the main page content
            const query = document.getElementById('search-input').value.toLowerCase();
            const filtered = sortRecords(filterRecords(query));
            displayPaginatedResults(filtered);
        } else {
            handleLocation();
        }
    });
    
    handleLocation();
}

initializeApp();