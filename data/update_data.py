import json
import os

def load_records():
    if not os.path.exists('records.json'):
        return []
    with open('records.json', 'r') as file:
        return json.load(file)

def save_records(records):
    with open('records.json', 'w') as file:
        json.dump(records, file, indent=4)

def find_artist(records, artist_name):
    for artist in records:
        if artist['name'].lower() == artist_name.lower():
            return artist
    return None

def add_new_artist(records):
    artist_name = input("Enter the artist's name: ")
    new_artist = {
        "name": artist_name,
        "albums": []
    }
    records.append(new_artist)
    return new_artist

def add_new_album(artist):
    album_title = input("Enter the album's title: ")
    image_name = input("Enter the image file name (e.g., album.jpg): ")
    new_album = {
        "title": album_title,
        "image": f"./images/{image_name}"
    }
    artist['albums'].append(new_album)

def main():
    records = load_records()
    artist_name = input("Enter the artist's name: ")
    artist = find_artist(records, artist_name)
    
    if artist:
        print(f"Artist '{artist_name}' found. Adding new album.")
    else:
        print(f"Artist '{artist_name}' not found. Adding new artist.")
        artist = add_new_artist(records)
    
    add_new_album(artist)
    save_records(records)
    print("Record updated successfully.")

if __name__ == "__main__":
    main()
