# Quiz Generator

## Overview

Quiz Generator is an innovative application designed to automatically create educational quizzes from a wide range of content inputs. Whether you provide text, documents (PDF, DOCX), images, or even audio and video, our AI-powered system intelligently analyzes the content. It extracts key information, generates concise summaries, and crafts relevant multiple-choice questions complete with automated scoring. This tool streamlines the quiz creation process, making it easier than ever to assess knowledge and understanding.

## How It Works

1.  **Content Input:** Users can provide content in several ways:
    * Directly typing or pasting text into a text field.
    * Uploading files such as PDFs (.pdf) and DOCX (.docx).
    * Uploading images, where the text content will be extracted.
    * Uploading audio or video files, which will be transcribed and then analyzed.
2.  **Content Processing:** The application utilizes specialized libraries to handle different file types:
    * `PDF.js` is employed to process PDF files, extracting text content from each page.
    * `Mammoth.js` is used to extract raw text from DOCX files, preserving basic formatting.
    * `Tesseract.js` performs Optical Character Recognition (OCR) on images to extract text.
    * OpenAI Whisper API transcribes audio and video content into text.
3.  **AI Analysis & Quiz Generation:** The processed text from all sources is then sent to OpenAI's powerful GPT. Leveraging its advanced natural language understanding capabilities, the AI:
    * Generates a concise and informative summary of the provided content.
    * Creates a set of multiple-choice questions that are relevant to the content.
4.  **Quiz Completion & Feedback:**
    * Users interact with a clean and intuitive quiz interface, answering the generated questions.
    * Upon completion, users receive immediate feedback on their performance, including their score and potentially the correct answers.

## Technologies Used

* **Frontend Framework:** React.js - A JavaScript library for building user interfaces.
* **Document Processing:**
    * `PDF.js` - A library for rendering and working with PDF files.
    * `Mammoth.js` - A library to convert .docx files to plain text.
* **Image OCR:** `Tesseract.js` - A JavaScript port of the Tesseract OCR engine.
* **AI for Content Analysis & Question Generation:** OpenAI API (GPT-4o) - A cutting-edge language model for understanding and generating text.
* **Audio/Video Transcription:** OpenAI Whisper API - An advanced model for transcribing audio into text.

## Contributors

* Mamuka Sarkisyan
* Mariam Kavtaradze
* Nika Koghuashvili

## Course Information

* Building AI powered Applications
* Kutaisi International University
* 4th year

## Development Documentation

### Project Initialization

The project was initialized using Create React App, providing a pre-configured React development environment. This setup included a development server for live updates, file watching for automatic rebuilds, and optimized build tools for production deployment.

### Document Parsing Functionality

* **PDF Parsing (`parsePDF`)**: Implemented using `pdfjsLib`, this asynchronous function reads all pages of an uploaded PDF. The `getTextContent()` method is used to extract the text content from each page. A key challenge addressed was ensuring the logical flow of content across multiple pages.
    ```javascript
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    ```

* **DOCX Extraction (`parseDOCX`)**: We utilized `Mammoth.js` to efficiently extract raw text from .docx files. This library simplifies the process of handling the complex XML structure of DOCX files.
    ```javascript
    const result = await mammoth.extractRawText({ arrayBuffer });
    ```

* **Manual Text Input**: The application includes a form field allowing users to directly input or paste text. This provides flexibility for quickly analyzing short text snippets or trying the system without uploading files. The application checks if the text input field is not empty upon submission:
    ```javascript
    if (textInput.trim()) texts.push(textInput);
    ```

### Content Analysis & Quiz Generation

The collected text, regardless of its source (uploaded files or direct input), is sent to the OpenAI GPT. A carefully crafted system prompt ensures that the AI generates both a summary and a set of quiz questions in a specific JSON format that the frontend application expects.

**Example JSON Schema:**

```json
{
  "summary": "string",
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": "string"
    }
  ]
}
```

# Implementation Details

During this stage of development, we focused on several key areas:

## API Response Processing

* **Markdown Removal:** To ensure clean text display on the frontend, any existing Markdown formatting within the API response is systematically removed.
* **Robust JSON Parsing:** We utilize `JSON.parse()` with comprehensive error handling to gracefully manage any potential issues or inconsistencies in the API response format. This prevents application crashes and provides a more stable user experience.
* **Temperature Control:** The `temperature` parameter in the OpenAI API request is set to `0.7`. This specific value aims to strike a balance between the AI's creative potential in generating diverse questions and the need to maintain the relevance and accuracy of the quiz content.

## Quiz Interface & Scoring

The quiz interface is designed with a focus on user experience, providing clear interaction and immediate feedback. Key features include:

* **Resettable State:** Upon submission of new content for quiz generation, the entire quiz state is automatically reset. This ensures a fresh and uncluttered experience for each new quiz attempt.
* **Immediate Feedback:** Once the user completes all the questions in the quiz, the application instantly calculates and displays their final score.
* **JSON-Structured Quiz State:** The quiz data, including questions and answers, is managed using a well-defined JSON structure. This approach facilitates easy reusability and manipulation of the quiz elements within the application's logic.

## Key Challenges

Throughout the development process, we encountered and successfully addressed several significant challenges:

* **Managing Asynchronous Operations:** Coordinating asynchronous tasks proved complex, particularly when dealing with multiple files of varying types. Chaining asynchronous logic (such as file reading, text extraction, and API calls) required meticulous implementation using `async/await` and robust Promise handling to ensure proper execution flow and prevent race conditions.
* **Parsing Robustness:** Achieving reliable text extraction from diverse PDF and DOCX file formats presented a significant hurdle. These formats can have inconsistent structures and encodings. Our focus was on implementing robust parsing mechanisms to minimize data loss and potential errors during the extraction process.
* **Consistent API Output:** Ensuring a consistent and predictable JSON response format from the OpenAI API was critical for the stability and reliability of the frontend application. To address this, we implemented strict prompting strategies and comprehensive error handling to effectively manage variations in the API's output.
