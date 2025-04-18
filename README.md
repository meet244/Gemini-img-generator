# Gemini Image Generator

A static web application that allows users to generate images using Google's Gemini API by providing text prompts and optional reference images.

## Features

- Enter your Gemini API key (with show/hide toggle)
- Dynamic text area for entering prompts
- Upload images via file selection or clipboard paste (Ctrl+V)
- Generate 4 images in parallel from a single prompt
- Save history and liked images in browser storage

## How to Use

Simply open the `index.html` file in your browser. No server required!

## Usage

1. Enter your Gemini API key in the top input field
2. Type your prompt in the text area
3. Optionally add an image by:
   - Pasting from clipboard (Ctrl+V)
   - Clicking the image icon and selecting a file
4. Click "Generate Images" to create 4 image variations
5. Wait for the images to be generated and displayed

## Requirements

- A valid Gemini API key (get one from https://makersuite.google.com/app/apikey)
- A modern web browser

## Notes

- You need a valid API key for the Gemini API to use this application
- The Gemini model used is `gemini-2.0-flash-exp-image-generation`
- Image generation can take some time depending on server load and complexity of the prompt

## License

MIT 