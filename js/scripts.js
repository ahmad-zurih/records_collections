const recordsPerPage = 10; // Number of records per page
let currentPage = 1; // Track the current page

/**
 * Fetches the local records data.
 */
async function fetchData() {
    const response = await fetch('data/records.json');
    const data = await response.json();
    return data;
}

/**
 * Searches for a Wikipedia page for a given album and artist.
 * @param {string} albumTitle - The title of the album.
 * @param {string} artistName - The name of the artist.
 * @returns {Promise<string|null>} A promise that resolves to the Wikipedia URL or null if not found.
 */
async function getWikipediaLink(albumTitle, artistName) {
    // Construct a specific search query to improve accuracy (e.g., "The Wall Pink Floyd album")
    const searchQuery = `${albumTitle} ${artistName} album`;
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchQuery)}&limit=1&namespace=0&format=json&origin=*`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null; // Don't block if the network fails
        const data = await response.json();
        // The opensearch format returns an array: [query, [titles], [descriptions], [links]]
        // If the links array exists and has a URL, return the first one.
        if (data[3] && data[3].length > 0) {
            return data[3][0];
        }
        return null; // No link found
    } catch (error) {
        console.error("Failed to fetch Wikipedia link for:", albumTitle, error);
        return null; // Return null on any error
    }
}

function searchRecords(page = 1) {
    currentPage = page;
    const query = document.getElementById('search-input').value.toLowerCase();
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<h2>Loading...</h2>'; // Show a loading message

    fetchData().then(async (records) => { // Make the callback async to use 'await'
        let filteredRecords = [];

        // Filter records based on the query (same logic as before)
        records.forEach(artist => {
            if (artist.name.toLowerCase().includes(query)) {
                filteredRecords.push(...artist.albums.map(album => ({ ...album, artist: artist.name })));
            } else {
                artist.albums.forEach(album => {
                    if (album.title.toLowerCase().includes(query)) {
                        filteredRecords.push({ ...album, artist: artist.name });
                    }
                });
            }
        });

        // Sort records (same logic as before)
        filteredRecords.sort((a, b) => {
            if (a.artist.toLowerCase() < b.artist.toLowerCase()) return -1;
            if (a.artist.toLowerCase() > b.artist.toLowerCase()) return 1;
            if (a.title.toLowerCase() < b.title.toLowerCase()) return -1;
            if (a.title.toLowerCase() > b.title.toLowerCase()) return 1;
            return 0;
        });

        const totalRecords = filteredRecords.length;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);
        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
        
        // Clear the loading message and prepare the container
        resultsDiv.innerHTML = '';
        const resultsContainer = document.createElement('div');
        resultsContainer.classList.add('results-container');
        resultsDiv.appendChild(resultsContainer);

        if (paginatedRecords.length === 0) {
            resultsContainer.innerHTML = '<p>No results found</p>';
        } else {
            // Create an array of promises for building each record element
            const recordElementPromises = paginatedRecords.map(async (record) => {
                const recordDiv = document.createElement('div');
                recordDiv.classList.add('record');

                const img = document.createElement('img');
                img.src = record.image;
                img.alt = record.title;

                const title = document.createElement('h2');
                title.textContent = record.title;

                const artist = document.createElement('p');
                artist.textContent = `by ${record.artist}`;

                recordDiv.appendChild(img);
                recordDiv.appendChild(title);
                recordDiv.appendChild(artist);

                // Fetch the Wikipedia link for this record
                const wikiLink = await getWikipediaLink(record.title, record.artist);

                // If a link is found, wrap the record card in an <a> tag
                if (wikiLink) {
                    recordDiv.classList.add('clickable');
                    const linkWrapper = document.createElement('a');
                    linkWrapper.href = wikiLink;
                    linkWrapper.target = '_blank'; // Open in a new tab
                    linkWrapper.title = `View "${record.title}" on Wikipedia`;
                    linkWrapper.appendChild(recordDiv);
                    return linkWrapper;
                }
                
                return recordDiv; // Return the plain div if no link is found
            });

            // Wait for all Wikipedia lookups to complete
            const recordElements = await Promise.all(recordElementPromises);
            recordElements.forEach(element => resultsContainer.appendChild(element));
        }

        // Display the number of results found
        const resultCount = document.createElement('p');
        resultCount.classList.add('result-count');
        resultCount.textContent = `${totalRecords} result(s) found`;
        resultsDiv.appendChild(resultCount);

        // Add pagination controls (same logic as before)
        if (totalPages > 1) {
            const paginationDiv = document.createElement('div');
            paginationDiv.classList.add('pagination');
            if (currentPage > 1) {
                const prevButton = document.createElement('button');
                prevButton.textContent = 'Previous';
                prevButton.onclick = () => searchRecords(currentPage - 1);
                paginationDiv.appendChild(prevButton);
            }
            for (let i = 1; i <= totalPages; i++) {
                const pageButton = document.createElement('button');
                pageButton.textContent = i;
                if (i === currentPage) pageButton.classList.add('active');
                pageButton.onclick = () => searchRecords(i);
                paginationDiv.appendChild(pageButton);
            }
            if (currentPage < totalPages) {
                const nextButton = document.createElement('button');
                nextButton.textContent = 'Next';
                nextButton.onclick = () => searchRecords(currentPage + 1);
                paginationDiv.appendChild(nextButton);
            }
            resultsDiv.appendChild(paginationDiv);
        }
    });
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    searchRecords(1);
}

window.onload = function() {
    searchRecords();
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            searchRecords();
        }
    });
};