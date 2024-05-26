async function fetchData() {
    const response = await fetch('data/records.json');
    const data = await response.json();
    return data;
}

function searchRecords() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    fetchData().then(records => {
        const filteredRecords = [];

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

        if (filteredRecords.length === 0) {
            resultsDiv.innerHTML = '<p>No results found</p>';
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
                resultsDiv.appendChild(recordDiv);
            });
        }
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
