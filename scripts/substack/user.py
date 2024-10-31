import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36"
}


def get_user_notes(user_id: int):
    """
    Get notes posted by a user.

    Parameters
    ----------
    user_id : int
        The user ID of the Substack user.
    """
    endpoint = f"https://substack.com/api/v1/reader/feed/profile/{user_id}"
    r = requests.get(endpoint, headers=HEADERS, timeout=30)
    next_cursor = r.json()["nextCursor"]
    print(f"Next cursor: {next_cursor}")
    notes = r.json()["items"]
    
    # Get notes
    all_reactions = []
    # Get note reaction count
    filtered_notes = [note["comment"]["reaction_count"] for note in notes if note["type"] == "comment"]
    all_reactions.extend(filtered_notes)
    endpoint_with_cursor = f"https://substack.com/api/v1/reader/feed/profile/{user_id}?cursor={next_cursor}"
    next_page_response = requests.get(endpoint_with_cursor, headers=HEADERS, timeout=30)

    # The following cursor
    next_page_response_cursor = next_page_response.json()["nextCursor"]
    next_cursor = r.json()["nextCursor"]
    
    notes = next_page_response.json()["items"]
    filtered_notes = [note["comment"]["reaction_count"] for note in notes if note["type"] == "comment"]
    all_reactions.extend(filtered_notes)

    return all_reactions
