from substack.user import get_user_notes

username = "11638205"  # Replace with the actual username
user_notes = get_user_notes(username)
print(f"User notes for {username}: {user_notes}")