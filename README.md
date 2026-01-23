# Telegram Channel Verification Bot (Channel Guard)

A high-performance Telegram bot that enforces channel membership for group participants. If a user speaks in your group without being subscribed to your channel, they are automatically muted until they verify their subscription.

## 🚀 Features

*   **Instant Join Check**: Verifies users the **moment they join the group**, preventing abuse before it starts.
*   **Strict Leave Detection**: If a verified user leaves your channel, the bot **instantly restricts** them in the group.
*   **Instant Enforcement**: Automatically deletes messages from non-members and mutes them.
*   **User-Friendly**: Sends a warning with a "Join Channel" link and a "Verify" button.
*   **Smart Verification**: Users can self-unmute immediately after joining the channel.
*   **High Performance**: Uses **Membership Caching** and **Concurrent Updates** to handle high-traffic groups with zero latency.
*   **Safe Permissions**: Validates bot rights and uses granular permissions to avoid API errors.

## 🛠️ Tech Stack

*   **Python 3.13+**
*   **python-telegram-bot** (v20+ Async)
*   User Membership Caching (LRU)

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/mohdakil2426/Telegram-Channel-Verification-Bot.git
    cd Telegram-Channel-Verification-Bot
    ```

2.  **Create a Virtual Environment**
    ```bash
    python -m venv venv
    # Windows
    .\venv\Scripts\activate
    # Linux/Mac
    source venv/bin/activate
    ```

3.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configuration**
    Copy `.env.example` to `.env` and fill in your details:
    ```bash
    cp .env.example .env
    ```
    
    *   `BOT_TOKEN`: Get from @BotFather.
    *   `CHANNEL_ID`: The ID (e.g., `@mychannel`) or numeric ID of your channel.
    *   `CHANNEL_URL`: Link to your channel (e.g., `https://t.me/mychannel`).
    *   `GROUP_ID`: **REQUIRED**. The ID of the group to police (e.g. `@mygroup`).

## 🚀 Usage

1.  **Run the Bot**
    ```bash
    python main.py
    ```

2.  **Setup in Telegram (CRITICAL)**
    *   **Channel Admin**: Add the bot to your **Channel** as an Administrator. This is **REQUIRED** for the bot to detect when users leave.
    *   **Group Admin**: Add the bot to your **Group** as an Administrator (Must have "Ban/Restrict Users" and "Delete Messages" rights).

## 🤝 Contributing

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📝 License

Distributed under the MIT License.
