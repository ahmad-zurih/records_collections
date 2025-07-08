const recordsPerPage = 10;
let currentPage = 1;

// --- VIEW MANAGEMENT ---

function showMainView() {
    document.getElementById('details-view').style.display = 'none';
    document.getElementById('main-view').style.display = 'block';
}

async function showDetailsView(record) {
    const mainView = document.getElementById('main-view');
    const detailsView = document.getElementById('details-view');
    
    mainView.style.display = 'none';
    detailsView.style.display = 'block';
    detailsView.innerHTML = '<h2><span class="loading-animation"></span> Loading Album Details...</h2>';

    const content = await getWikipediaContent(record.title, record.artist);

    let introHtml = '<p>No description found or failed to fetch the data correctly.</p>';
    if (content && content.intro) {
        introHtml = content.intro;
    }

    let tracklistHtml = '<p>No track listing found or failed to fetch the data correctly.</p>';
    if (content && content.tracklist) {
        tracklistHtml = content.tracklist;
    }

    detailsView.innerHTML = `
        <button class="back-button" onclick="showMainView()">← Back to Search</button>
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


// --- WIKIPEDIA API & PARSING (Completely Rewritten) ---

async function getWikipediaContent(albumTitle, artistName) {
    try {
        // Step 1: Use a more robust search to find the correct page title
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(albumTitle + " " + artistName)}&srlimit=1&format=json&origin=*`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();
        
        if (!searchData.query.search || searchData.query.search.length === 0) {
            console.log("No Wikipedia page found for:", albumTitle);
            return null;
        }
        const pageTitle = searchData.query.search[0].title;

        // Step 2: Fetch the parsed HTML content of the found page
        const contentUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&format=json&origin=*`;
        const contentResponse = await fetch(contentUrl);
        const contentData = await contentResponse.json();
        const htmlContent = contentData.parse.text['*'];

        // Step 3: Parse the HTML into a document we can work with
        const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
        const contentRoot = doc.querySelector('.mw-parser-output');

        if (!contentRoot) return null;

        // --- INTELLIGENT EXTRACTION & CLEANING ---

        // Remove unwanted elements like edit links, references, navboxes etc. before processing
        contentRoot.querySelectorAll('.mw-editsection, sup.reference, .navbox').forEach(el => el.remove());

        // A. Extract the Introduction
        let intro = '';
        for (const child of contentRoot.children) {
            // Find the first proper paragraph, skipping infoboxes and other initial elements
            if (child.tagName === 'P' && child.textContent.trim().length > 10) {
                intro = child.outerHTML;
                break;
            }
        }
        
        // B. Extract the Track Listing more carefully
        const tracklistHeading = doc.getElementById('Track_listing') || doc.getElementById('Track_list');
        let tracklistHtml = '';
        if (tracklistHeading) {
            let currentNode = tracklistHeading.parentElement.nextElementSibling;
            // Stop when we hit the next H2 or H3 heading, which signals a new major section
            while (currentNode && !['H2', 'H3'].includes(currentNode.tagName)) {
                tracklistHtml += currentNode.outerHTML;
                currentNode = currentNode.nextElementSibling;
            }
        }
        
        return {
            intro: intro || null,
            tracklist: tracklistHtml || null
        };

    } catch (error) {
        console.error("Failed to fetch or parse Wikipedia content:", error);
        return null;
    }
}


// --- CORE APP LOGIC (Minor Updates) ---

async function fetchData() {
    const response = await fetch('data/records.json');
    return await response.json();
}

function searchRecords(page = 1) {
    currentPage = page;
    const query = document.getElementById('search-input').value.toLowerCase();
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<h2><span class="loading-animation"></span> Loading...</h2>';

    fetchData().then(records => {
        let filteredRecords = [];
        // A more robust filtering logic
        const searchTerms = query.split(' ').filter(term => term.length > 0);
        
        records.forEach(artist => {
            const artistName = artist.name;
            artist.albums.forEach(album => {
                const record = { ...album, artist: artistName };
                const recordText = `${artistName} ${album.title}`.toLowerCase();
                
                // Show all if query is empty, otherwise check if all search terms are included
                if (query === '' || searchTerms.every(term => recordText.includes(term))) {
                    filteredRecords.push(record);
                }
            });
        });
        
        filteredRecords.sort((a, b) => {
            if (a.artist.toLowerCase() < b.artist.toLowerCase()) return -1;
            if (a.artist.toLowerCase() > b.artist.toLowerCase()) return 1;
            if (a.title.toLowerCase() < b.title.toLowerCase()) return -1;
            return 1;
        });

        resultsDiv.innerHTML = '';
        displayPaginatedResults(filteredRecords);
    });
}

function displayPaginatedResults(filteredRecords) {
    const resultsDiv = document.getElementById('results');
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
            recordDiv.addEventListener('click', () => showDetailsView(record));
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
        // Add previous button
        if (currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Previous';
            prevButton.onclick = () => {
                currentPage--;
                displayPaginatedResults(filteredRecords);
            };
            paginationDiv.appendChild(prevButton);
        }
        // Add page number display
        const pageInfo = document.createElement('span');
        pageInfo.textContent = ` Page ${currentPage} of ${totalPages} `;
        pageInfo.style.margin = '0 10px';
        paginationDiv.appendChild(pageInfo);
        // Add next button
        if (currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Next';
            nextButton.onclick = () => {
                currentPage++;
                displayPaginatedResults(filteredRecords);
            };
            paginationDiv.appendChild(nextButton);
        }
        resultsDiv.appendChild(paginationDiv);
    }
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    searchRecords(1);
}

window.onload = function() {
    // We need to attach event listeners after the DOM is loaded
    document.getElementById('search-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            searchRecords();
        }
    });
    searchRecords();
};