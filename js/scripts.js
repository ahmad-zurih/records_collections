async function fetchData() {
    const response = await fetch('data/records.json');
    const data = await response.json();
    return data;
}

function searchRecords() {
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

        if (filteredRecords.length === 0) {
            resultsContainer.innerHTML = '<p>No results found</p>';
        } else {
            filteredRecords.forEach(record => {
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
        resultCount.textContent = `${filteredRecords.length} result(s) found`;
        resultsDiv.appendChild(resultCount);
    });
}


window.onload = function() {
    fetchData();
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            searchRecords();
        }
    });
};
