const recordsPerPage = 10; // Number of records per page
let currentPage = 1; // Track the current page

async function fetchData() {
    const response = await fetch('data/records.json');
    const data = await response.json();
    return data;
}

function searchRecords(page = 1) {
    currentPage = page; // Update current page
    const query = document.getElementById('search-input').value.toLowerCase();
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';  // Clear previous results

    const resultsContainer = document.createElement('div');
    resultsContainer.classList.add('results-container');
    resultsDiv.appendChild(resultsContainer);

    fetchData().then(records => {
        let filteredRecords = [];

        // Filter records based on the query
        records.forEach(artist => {
            if (artist.name.toLowerCase().includes(query)) {
                filteredRecords.push(...artist.albums.map(album => ({
                    artist: artist.name,
                    title: album.title,
                    image: album.image
                })));
            } else {
                artist.albums.forEach(album => {
                    if (album.title.toLowerCase().includes(query)) {
                        filteredRecords.push({
                            artist: artist.name,
                            title: album.title,
                            image: album.image
                        });
                    }
                });
            }
        });

        // Sort filtered records alphabetically by artist name, then by album title
        filteredRecords.sort((a, b) => {
            if (a.artist.toLowerCase() < b.artist.toLowerCase()) return -1;
            if (a.artist.toLowerCase() > b.artist.toLowerCase()) return 1;
            if (a.title.toLowerCase() < b.title.toLowerCase()) return -1;
            if (a.title.toLowerCase() > b.title.toLowerCase()) return 1;
            return 0;
        });

        // Calculate pagination details
        const totalRecords = filteredRecords.length;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);
        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

        if (paginatedRecords.length === 0) {
            resultsContainer.innerHTML = '<p>No results found</p>';
        } else {
            paginatedRecords.forEach(record => {
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
                resultsContainer.appendChild(recordDiv);
            });
        }

        // Display the number of results found
        const resultCount = document.createElement('p');
        resultCount.classList.add('result-count');
        resultCount.textContent = `${totalRecords} result(s) found`;
        resultsDiv.appendChild(resultCount);

        // Add pagination controls
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
                if (i === currentPage) {
                    pageButton.classList.add('active');
                }
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

/**
 * Clears the search input and displays all records from the first page.
 */
function clearSearch() {
    document.getElementById('search-input').value = '';
    searchRecords(1); // Re-run search with empty query to show all records
}

window.onload = function() {
    searchRecords(); // Display all records on page load
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            searchRecords();
        }
    });
};