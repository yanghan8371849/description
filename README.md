# AI Vocabulary Learning Web App

## Project Overview

The AI Vocabulary Learning Web App is a web-based English vocabulary learning tool developed with the assistance of Generative AI technologies. Users can input English words, automatically generate Chinese meanings through AI, and store the vocabulary data in a cloud database for future review and learning.

The application is responsive and supports both desktop and mobile devices. It is deployed online using Vercel and can be accessed through a web browser.

---

# Features

### 1. Word Input

* Manually enter English words.
* Save words to the cloud database.

### 2. AI-Powered Meaning Generation

* Automatically generate Chinese meanings using the DeepSeek AI API.
* Save generated meanings to the database.

### 3. Vocabulary History Management

* Browse previously saved vocabulary.
* View words and their corresponding meanings.
* Build a personal vocabulary database.

### 4. Responsive Design

* Supports desktop, tablet, and mobile devices.
* Optimized user experience across different screen sizes.

---

# AI Tools Used

## ChatGPT

Used for:

* Project planning and design
* Code generation
* Logic optimization
* Debugging assistance
* Documentation writing

## DeepSeek AI API

Used for:

* Automatic Chinese meaning generation
* Natural language understanding

## Visual Studio Code

Used for:

* Development
* Code editing and debugging

---

# Technology Stack

## Frontend

* HTML5
* Tailwind CSS
* JavaScript (ES6)

## Backend Database

* Supabase
* PostgreSQL Cloud Database

## AI Service

* DeepSeek API

## Deployment

* Vercel

---

# System Architecture

User Browser

↓

Frontend (HTML + Tailwind CSS + JavaScript)

↓

DeepSeek AI API

↓

Supabase Database

↓

Cloud Storage & Retrieval

---

# Database Schema

## Table: words

| Column     | Type      | Description     |
| ---------- | --------- | --------------- |
| id         | bigint    | Primary Key     |
| word       | text      | English Word    |
| meaning    | text      | Chinese Meaning |
| created_at | timestamp | Creation Time   |

---

# Installation and Local Setup

## Prerequisites

* Modern web browser
* Supabase account
* DeepSeek API key
* Vercel account (optional)

---

## Clone the Project

```bash
git clone https://github.com/your-username/ai-vocabulary-app.git

cd ai-vocabulary-app
```

## Configure Supabase

Replace the following values in your JavaScript configuration:

```javascript
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

## Configure DeepSeek API

```javascript
const API_KEY = "YOUR_DEEPSEEK_API_KEY";
```

## Run Locally

Open the project folder and launch:

```text
index.html
```

Or use a local web server:

```bash
npx serve .
```

Then visit:

```text
http://localhost:3000
```

---

# Online Deployment

The project can be deployed on Vercel.

### Deployment Steps

1. Upload the project to GitHub.
2. Import the repository into Vercel.
3. Configure environment variables.
4. Deploy automatically.

Online URL:

```text
https://your-project.vercel.app
```

---

# Screenshots

## Home Page

<img width="1910" height="925" alt="c3bcc648b3fcbd44bdd3f82f594f238c" src="https://github.com/user-attachments/assets/12b245c4-caac-422d-8c1c-4038512b99c5" />


## Word Input Function

<img width="1910" height="925" alt="3401ce227b1a88b3e696d2ff792789e0" src="https://github.com/user-attachments/assets/39a0c27f-2831-45a2-aeb8-ad4e1d817325" />


## AI Meaning Generation

<img width="1910" height="925" alt="3401ce227b1a88b3e696d2ff792789e0" src="https://github.com/user-attachments/assets/86c260fa-7fb5-4b67-8f74-c148ed4c9ac2" />
---
# Project Highlights

* AI-powered vocabulary explanation
* Cloud database storage
* Responsive web design
* Serverless architecture
* Easy deployment with Vercel
* Modern frontend development workflow

---

# Future Improvements

Potential future features include:

* User authentication
* Personal vocabulary categories
* Favorites collection
* Vocabulary quizzes
* AI-generated example sentences
* Text-to-Speech pronunciation
* Learning progress tracking
* Spaced repetition review system

---

# Conclusion

This project demonstrates how Generative AI tools such as ChatGPT and DeepSeek can be integrated into modern web development workflows. By combining AI services, cloud databases, and serverless deployment platforms, the application provides a simple yet effective solution for English vocabulary learning.

The project also highlights the practical value of AI-assisted programming in improving development efficiency, reducing implementation complexity, and accelerating the software development lifecycle.

---

## Author

Student Project – AI-Assisted Web Development

Developed using:

* ChatGPT
* DeepSeek AI
* Supabase
* Vercel
* Visual Studio Code



