"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
const DEFAULT_SETTINGS = {
    apiKey: "", // Hugging Face API Key
    openaiApiKey: "", // OpenAI API Key
    claudeApiKey: "", // Claude API Key
    googleApiKey: "", // Google API Key
    aiModel: "mixtral", // Standard-Modell auf Mixtral geändert
    language: "de",
};
const VIEW_TYPE_STORY_QUESTIONS = "story-questions-view";
const EDIT_QUESTIONS_VIEW_TYPE = "edit-questions-view";
// Übersetzungsfunktion
function t(plugin, key) {
    const translations = {
        de: {
            storyQuestions: "Story Fragen",
            filterCategory: "Kategorie filtern",
            randomQuestion: "Zufällige Frage",
            generateQuestions: "Fragen generieren",
            generating: "Generiere Fragen...",
            refresh: "Aktualisieren",
            apiKey: "Hugging Face API-Schlüssel",
            apiKeyDesc: "Geben Sie Ihren Hugging Face API-Schlüssel ein.",
            huggingFaceApiKey: "Hugging Face API-Schlüssel",
            huggingFaceApiKeyDesc: "Geben Sie Ihren Hugging Face API-Schlüssel ein.",
            openaiApiKey: "OpenAI API-Schlüssel",
            openaiApiKeyDesc: "Geben Sie Ihren OpenAI API-Schlüssel ein.",
            claudeApiKey: "Claude API-Schlüssel",
            claudeApiKeyDesc: "Geben Sie Ihren Claude API-Schlüssel ein.",
            googleApiKey: "Google API-Schlüssel",
            googleApiKeyDesc: "Geben Sie Ihren Google API-Schlüssel ein.",
            aiModel: "KI-Modell",
            aiModelDesc: "Wählen Sie das KI-Modell für die Fragen-Generierung.",
            language: "Sprache",
            languageDesc: "Wählen Sie die Sprache für die Fragen.",
            settingsTitle: "Story Questions Einstellungen",
            editQuestions: "Kategorien und Fragen",
        },
        en: {
            storyQuestions: "Story Questions",
            filterCategory: "Filter Category",
            randomQuestion: "Random Question",
            generateQuestions: "Generate Questions",
            generating: "Generating Questions...",
            refresh: "Refresh",
            apiKey: "Hugging Face API Key",
            apiKeyDesc: "Enter your Hugging Face API key.",
            huggingFaceApiKey: "Hugging Face API Key",
            huggingFaceApiKeyDesc: "Enter your Hugging Face API key.",
            openaiApiKey: "OpenAI API Key",
            openaiApiKeyDesc: "Enter your OpenAI API key.",
            claudeApiKey: "Claude API Key",
            claudeApiKeyDesc: "Enter your Claude API key.",
            googleApiKey: "Google API Key",
            googleApiKeyDesc: "Enter your Google API key.",
            aiModel: "AI Model",
            aiModelDesc: "Select the AI model for question generation.",
            language: "Language",
            languageDesc: "Select the language for the questions.",
            settingsTitle: "Story Questions Settings",
            editQuestions: "Categories and Questions",
        },
    };
    return translations[plugin.settings.language][key] || key;
}
// Funktion zum Laden der externen Prompts
async function loadPrompts(app, language) {
    console.log("Loading prompts from prompts.json for language:", language);
    try {
        const filePath = ".obsidian/plugins/story-questions/prompts.json";
        const fileContent = await app.vault.adapter.read(filePath);
        const prompts = JSON.parse(fileContent);
        console.log("Loaded prompts:", prompts); // Debugging
        return prompts[language] || {};
    }
    catch (error) {
        console.error("Error loading prompts.json:", error);
        return {};
    }
}
// Funktion zum Speichern der Prompts (neu)
async function savePrompts(app, language, prompts) {
    const filePath = ".obsidian/plugins/story-questions/prompts.json";
    let existingContent = "{}";
    try {
        existingContent = await app.vault.adapter.read(filePath);
    }
    catch (error) {
        console.log("prompts.json does not exist yet, creating new one.");
    }
    const allPrompts = JSON.parse(existingContent);
    allPrompts[language] = prompts;
    await app.vault.adapter.write(filePath, JSON.stringify(allPrompts, null, 2));
    console.log("DEBUG: Prompts saved:", prompts);
}
// Generates AI-based questions using the selected model and content
async function generateAIQuestions(content, settings) {
    // Checks for missing API keys based on the selected model
    if (!settings.apiKey && ["mixtral", "westlake", "qwen", "em_german_7b_v01-AWQ"].includes(settings.aiModel)) {
        console.error("No Hugging Face API key provided");
        return [settings.language === "de" ? "Fehler: Hugging Face API-Schlüssel fehlt" : "Error: Hugging Face API key missing"];
    }
    if (!settings.openaiApiKey && ["gpt4", "gpt35"].includes(settings.aiModel)) {
        console.error("No OpenAI API key provided");
        return [settings.language === "de" ? "Fehler: OpenAI API-Schlüssel fehlt" : "Error: OpenAI API key missing"];
    }
    if (!settings.claudeApiKey && ["claude3opus", "claude3sonnet", "claude3haiku"].includes(settings.aiModel)) {
        console.error("No Claude API key provided");
        return [settings.language === "de" ? "Fehler: Claude API-Schlüssel fehlt" : "Error: Claude API key missing"];
    }
    if (!settings.googleApiKey && ["gemini", "geminiultra"].includes(settings.aiModel)) {
        console.error("No Google API key provided");
        return [settings.language === "de" ? "Fehler: Google API-Schlüssel fehlt" : "Error: Google API key missing"];
    }
    // Determines the API endpoint and type based on the selected AI model
    let modelEndpoint = "";
    let apiType = "huggingface"; // Default API type
    switch (settings.aiModel) {
        // Hugging Face Models
        case "mixtral":
            modelEndpoint = "mistralai/Mixtral-8x7B-Instruct-v0.1";
            break;
        case "Westlake":
            modelEndpoint = "senseable/Westlake-7B";
            break;
        case "qwen":
            modelEndpoint = "Qwen/Qwen2.5-72B-Instruct";
            break;
        case "em_german_7b_v01-AWQ":
            modelEndpoint = "TheBloke/em_german_7b_v01-AWQ";
            break;
        case "bloom560m":
            modelEndpoint = "";
            break;
        // OpenAI Models
        case "gpt4":
            modelEndpoint = "gpt-4-turbo";
            apiType = "openai";
            break;
        case "gpt35":
            modelEndpoint = "gpt-3.5-turbo";
            apiType = "openai";
            break;
        // Claude Models
        case "claude3opus":
            modelEndpoint = "claude-3-opus-20240229";
            apiType = "claude";
            break;
        case "claude3sonnet":
            modelEndpoint = "claude-3-sonnet-20240229";
            apiType = "claude";
            break;
        case "claude3haiku":
            modelEndpoint = "claude-3-haiku-20240307";
            apiType = "claude";
            break;
        // Google Models
        case "gemini":
            modelEndpoint = "gemini-1.0-pro";
            apiType = "google";
            break;
        case "geminiultra":
            modelEndpoint = "gemini-1.0-ultra";
            apiType = "google";
            break;
        default:
            modelEndpoint = "Qwen/Qwen2.5-72B-Instruct"; // Fallback model
    }
    // Generates a timestamp and random number to ensure variation in requests
    const timestamp = Date.now();
    const randomNumber = Math.floor(Math.random() * 1000000);
    // Defines a variety of perspectives for question generation based on language
    const perspectives = settings.language === "de" ? [
        "Tiefe", "Charakterentwicklung", "Handlungsverlauf", "Themen", "Motive", "Konflikte",
        "Weltbildung", "Dialog", "Emotionen", "Symbolik", "Atmosphäre", "Spannungsaufbau",
        "Charakter-Motivation", "Innere Konflikte", "Beziehungsdynamik", "Hintergrundgeschichte",
        "Zukunftsperspektiven", "Unerwartete Wendungen", "Kulturelle Einflüsse", "Psychologische Aspekte"
    ] : [
        "depth", "character development", "plot progression", "themes", "motives", "conflicts",
        "world-building", "dialogue", "emotions", "symbolism", "atmosphere", "tension building",
        "character motivation", "internal conflicts", "relationship dynamics", "backstory",
        "future perspectives", "unexpected twists", "cultural influences", "psychological aspects"
    ];
    // Randomly selects 1-3 perspectives to add variety to prompts
    const shuffled = [...perspectives].sort(() => 0.5 - Math.random());
    const perspectiveCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 perspectives
    const selectedPerspectives = shuffled.slice(0, perspectiveCount);
    // Defines multiple prompt variations to ensure diverse question generation based on language
    const promptVariations = settings.language === "de" ? [
        `Analysiere diesen Text und erstelle 5 neue, VÖLLIG ANDERE Fragen zum Weiterschreiben. Fokus: ${selectedPerspectives.join(", ")}. Var#${randomNumber}`,
        `Als Schreibcoach: Formuliere 5 KREATIVE, UNGEWÖHNLICHE Fragen zu diesem Text. Keine Standardfragen! Timestamp: ${timestamp}`,
        `Erstelle 5 ÜBERRASCHENDE Fragen, die völlig neue Aspekte dieses Textes beleuchten. ID: ${randomNumber}`,
        `Generiere 5 TIEFGRÜNDIGE Fragen, die noch nie jemand zu diesem Text gestellt hat. Timestamp: ${timestamp}`,
        `Betrachte den Text aus einer VÖLLIG UNERWARTETEN PERSPEKTIVE und stelle 5 entsprechende Fragen. RND: ${randomNumber % 100}`,
        `Stelle 5 Fragen, die den Autor in eine VÖLLIG NEUE RICHTUNG lenken könnten. Tags: ${selectedPerspectives.join("/")}`,
        `Ignoriere offensichtliche Aspekte und formuliere 5 VERSTECKTE Fragen zum Text. Version: ${randomNumber % 50}`,
        `Stelle 5 Fragen, als wäre dieser Text ein RÄTSEL, das gelöst werden muss. Schlüssel: ${timestamp % 1000}`,
        `Als literarischer Detektiv: Welche 5 UNENTDECKTEN Geheimnisse verbirgt dieser Text? ID: ${randomNumber}`,
        `Formuliere 5 PROVOKATIVE Fragen, die den Autor zum Umdenken zwingen. Ansatz: ${randomNumber % 7}`,
        `Erstelle 5 Fragen, die den RAUM und die UMGEBUNG des Textes erkunden. Fokus: Schauplatz und Atmosphäre. Var#${randomNumber}`, // Neu
        `Generiere 5 Fragen, die die SINNE (Sehen, Hören, Fühlen) der Charaktere oder Leser ansprechen. Timestamp: ${timestamp}`, // Neu
        `Stelle 5 Fragen, die sich auf das GEGENWÄRTIGE im Text konzentrieren, auf den Moment und die aktuelle Situation. ID: ${randomNumber}` // Neu
    ] : [
        `Analyze this text and create 5 COMPLETELY DIFFERENT questions for further writing. Focus: ${selectedPerspectives.join(", ")}. Var#${randomNumber}`,
        `As a writing coach: Formulate 5 CREATIVE, UNUSUAL questions about this text. No standard questions! Timestamp: ${timestamp}`,
        `Create 5 SURPRISING questions that illuminate entirely new aspects of this text. ID: ${randomNumber}`,
        `Generate 5 PROFOUND questions that no one has ever asked about this text. Timestamp: ${timestamp}`,
        `View the text from a COMPLETELY UNEXPECTED PERSPECTIVE and ask 5 corresponding questions. RND: ${randomNumber % 100}`,
        `Ask 5 questions that could lead the author in a COMPLETELY NEW DIRECTION. Tags: ${selectedPerspectives.join("/")}`,
        `Ignore obvious aspects and formulate 5 HIDDEN questions about the text. Version: ${randomNumber % 50}`,
        `Ask 5 questions as if this text were a PUZZLE to be solved. Key: ${timestamp % 1000}`,
        `As a literary detective: What 5 UNDISCOVERED secrets does this text hide? ID: ${randomNumber}`,
        `Formulate 5 PROVOCATIVE questions that force the author to rethink. Approach: ${randomNumber % 7}`,
        `Create 5 questions that explore the SPACE and ENVIRONMENT of the text. Focus: Setting and atmosphere. Var#${randomNumber}`, // New
        `Generate 5 questions that engage the SENSES (sight, sound, touch) of the characters or readers. Timestamp: ${timestamp}`, // New
        `Ask 5 questions that focus on the PRESENT in the text, on the moment and current situation. ID: ${randomNumber}` // New
    ];
    // Randomly selects a prompt variation to increase diversity
    const promptIndex = Math.floor(Math.random() * promptVariations.length);
    const promptPrefix = promptVariations[promptIndex];
    // Processes the input content with random manipulations for variety
    let processedContent = content;
    const manipulationChoice = Math.floor(Math.random() * 5);
    switch (manipulationChoice) {
        case 0:
            // Uses the original content unchanged
            break;
        case 1:
            // Uses only the first 60% of the content
            const cutoff = Math.floor(content.length * 0.6);
            processedContent = content.substring(0, cutoff);
            break;
        case 2:
            // Uses only the last 60% of the content
            const start = Math.floor(content.length * 0.4);
            processedContent = content.substring(start);
            break;
        case 3:
            // Uses a random 1000-character segment if content is long enough
            if (content.length > 1000) {
                const maxStart = content.length - 1000;
                const randomStart = Math.floor(Math.random() * maxStart);
                processedContent = content.substring(randomStart, randomStart + 1000);
            }
            break;
        case 4:
            // Reorders paragraphs randomly if content is long enough
            if (content.length > 1000) {
                const paragraphs = content.split("\n\n");
                if (paragraphs.length > 1) {
                    paragraphs.sort(() => Math.random() - 0.5);
                    processedContent = paragraphs.slice(0, Math.min(5, paragraphs.length)).join("\n\n");
                }
            }
            break;
    }
    // Adjusts generation parameters for more varied outputs
    const temperature = 0.7 + (Math.random() * 0.6); // Ranges from 0.7 to 1.3
    const top_p = 0.8 + (Math.random() * 0.2); // Ranges from 0.8 to 1.0
    const top_k = 30 + Math.floor(Math.random() * 40); // Ranges from 30 to 70
    // Adds instructions to encourage unique responses based on language
    const variationInstructions = settings.language === "de" ? [
        "Sei kreativ und unkonventionell mit deinen Fragen.",
        "Stelle Fragen, die du selbst noch nie gestellt hast.",
        "Denke über die offensichtliche Fragen hinaus.",
        "Betrachte den Text aus einer unerwarteten Perspektive.",
        "Versuche, völlig neue Aspekte zu entdecken."
    ] : [
        "Be creative and unconventional with your questions.",
        "Ask questions you’ve never asked before.",
        "Think beyond the obvious questions.",
        "Consider the text from an unexpected perspective.",
        "Try to uncover completely new aspects."
    ];
    const randomInstruction = variationInstructions[Math.floor(Math.random() * variationInstructions.length)];
    // Adds explicit language instruction to ensure questions match the selected language
    const languageInstruction = settings.language === "de" ?
        "Stelle die Fragen ausschließlich auf Deutsch." :
        "Ask the questions exclusively in English.";
    // Constructs the final prompt with all variations included, ensuring language consistency
    const promptText = `${promptPrefix}\n\n${processedContent}\n\n${randomInstruction}\n\n${languageInstruction}\n\nNur die 5 Fragen zurückgeben, ohne Einleitung oder Erklärungen. Jede Frage auf einer neuen Zeile. Stelle UNTERSCHIEDLICHE Fragen als bei vorherigen Anfragen.` +
        (settings.language === "de" ?
            " Gib die Fragen auf Deutsch zurück." :
            " Return the questions in English.");
    try {
        console.log(`Sending request to model: ${modelEndpoint} using API type: ${apiType}`);
        console.log(`Prompt sent (language: ${settings.language}):`, promptText); // Logs prompt for debugging
        let response; // Defines response type
        // Sends request to the appropriate API based on the selected type
        switch (apiType) {
            case "huggingface":
                response = await (0, obsidian_1.requestUrl)({
                    url: `https://api-inference.huggingface.co/models/${modelEndpoint}`,
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${settings.apiKey}`,
                        "Content-Type": "application/json",
                        "X-Request-ID": `${timestamp}-${randomNumber}`,
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Pragma": "no-cache"
                    },
                    body: JSON.stringify({
                        inputs: promptText,
                        parameters: {
                            max_new_tokens: 256,
                            temperature: 0.7 + (Math.random() * 0.6),
                            return_full_text: false,
                            top_p: 0.8 + (Math.random() * 0.2),
                            top_k: 30 + Math.floor(Math.random() * 40),
                            do_sample: true,
                            presence_penalty: Math.random() * 0.5,
                            frequency_penalty: Math.random() * 0.5
                        },
                    }),
                    throw: true
                });
                break;
            case "openai":
                response = await (0, obsidian_1.requestUrl)({
                    url: "https://api.openai.com/v1/chat/completions",
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${settings.openaiApiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: modelEndpoint,
                        messages: [
                            { role: "system", content: settings.language === "de" ?
                                    "Du bist ein kreatives Schreibwerkzeug, das inspirierende Fragen für Autoren generiert. Antworte nur auf Deutsch." :
                                    "You are a creative writing tool that generates inspiring questions for authors. Respond only in English." },
                            { role: "user", content: promptText }
                        ],
                        temperature: 0.7 + (Math.random() * 0.6),
                        max_tokens: 256,
                        top_p: 0.8 + (Math.random() * 0.2),
                        frequency_penalty: Math.random() * 0.5,
                        presence_penalty: Math.random() * 0.5
                    }),
                    throw: true
                });
                break;
            case "claude":
                response = await (0, obsidian_1.requestUrl)({
                    url: "https://api.anthropic.com/v1/messages",
                    method: "POST",
                    headers: {
                        "x-api-key": settings.claudeApiKey,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: modelEndpoint,
                        messages: [
                            { role: "user", content: promptText }
                        ],
                        max_tokens: 256,
                        temperature: 0.7 + (Math.random() * 0.6),
                    }),
                    throw: true
                });
                break;
            case "google":
                response = await (0, obsidian_1.requestUrl)({
                    url: `https://generativelanguage.googleapis.com/v1beta/models/${modelEndpoint}:generateContent`,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": settings.googleApiKey
                    },
                    body: JSON.stringify({
                        contents: [
                            { role: "user", parts: [{ text: promptText }] }
                        ],
                        generationConfig: {
                            temperature: 0.7 + (Math.random() * 0.6),
                            topP: 0.8 + (Math.random() * 0.2),
                            topK: 30 + Math.floor(Math.random() * 40),
                            maxOutputTokens: 256
                        }
                    }),
                    throw: true
                });
                break;
            default:
                throw new Error(`Unsupported API type: ${apiType}`);
        }
        console.log("API response status:", response.status); // Logs response status
        // Extracts generated text from the API response based on type
        let generatedText = "";
        switch (apiType) {
            case "huggingface":
                if (Array.isArray(response.json)) {
                    generatedText = response.json[0]?.generated_text || "";
                }
                else if (typeof response.json === "object" && response.json?.generated_text) {
                    generatedText = response.json.generated_text;
                }
                else if (typeof response.json === "string") {
                    generatedText = response.json;
                }
                break;
            case "openai":
                generatedText = response.json?.choices?.[0]?.message?.content || "";
                break;
            case "claude":
                generatedText = response.json?.content?.[0]?.text || "";
                break;
            case "google":
                generatedText = response.json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                break;
        }
        // Processes the generated text into a list of cleaned questions
        const questions = generatedText
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && line.length > 5)
            .filter((line) => !line.includes("Session-ID"))
            .filter((line) => !line.includes("plugin:story-questions"))
            .filter((line) => !line.includes("Einzigartige"))
            .map((line) => {
            let cleanLine = line.replace(/^\d+[\.\)\-]?\s*/, ''); // Removes numbering
            cleanLine = cleanLine.replace(/^[QF]:\s*/, ''); // Removes prefixes
            if (!cleanLine.endsWith("?"))
                cleanLine += "?"; // Ensures question mark
            return cleanLine;
        })
            .filter((line, index, self) => self.indexOf(line) === index) // Removes duplicates
            .slice(0, 5); // Limits to 5 questions
        console.log("Processed questions:", questions); // Logs processed questions
        // Returns a fallback message if no questions are generated
        if (questions.length === 0) {
            return [settings.language === "de" ?
                    `Keine Fragen generiert. Versuche es erneut.` :
                    `No questions generated. Try again.`];
        }
        return questions; // Returns the list of generated questions
    }
    catch (error) {
        console.error("Error generating questions:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = error.status || 'unknown';
        console.error(`API error: ${errorMessage} (Status: ${statusCode})`);
        // Returns a specific error message based on the API type
        let errorText = "";
        switch (settings.aiModel) {
            case "gpt4":
            case "gpt35":
                errorText = settings.language === "de" ?
                    `Fehler bei OpenAI API: ${errorMessage} (${statusCode})` :
                    `Error with OpenAI API: ${errorMessage} (${statusCode})`;
                break;
            case "claude3opus":
            case "claude3sonnet":
            case "claude3haiku":
                errorText = settings.language === "de" ?
                    `Fehler bei Claude API: ${errorMessage} (${statusCode})` :
                    `Error with Claude API: ${errorMessage} (${statusCode})`;
                break;
            case "gemini":
            case "geminiultra":
                errorText = settings.language === "de" ?
                    `Fehler bei Google API: ${errorMessage} (${statusCode})` :
                    `Error with Google API: ${errorMessage} (${statusCode})`;
                break;
            default:
                errorText = settings.language === "de" ?
                    `Fehler bei Hugging Face API: ${errorMessage} (${statusCode})` :
                    `Error with Hugging Face API: ${errorMessage} (${statusCode})`;
        }
        return [errorText]; // Returns the error as a single-item array
    }
}
class StoryQuestionsView extends obsidian_1.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.prompts = {};
        this.lastDropTime = 0;
        this.lastDropId = "";
        this.processedDrops = new Set();
        this.plugin = plugin;
        console.log("DEBUG: StoryQuestionsView initialized - Version 17 Stable");
        // Dragstart-Handler
        this.registerDomEvent(document, "dragstart", (evt) => {
            const target = evt.target;
            if (target.classList.contains("draggable")) {
                const questionText = target.textContent || "";
                evt.dataTransfer.setData("text/plain", questionText);
                evt.dataTransfer.effectAllowed = "copy";
                this.lastDropId = `${Date.now()}-${Math.random()}`; // Neue eindeutige ID für jeden Drag
                console.log("DEBUG: Drag started - New dropId:", this.lastDropId, "Question:", questionText);
            }
            else {
                console.log("DEBUG: Dragstart on non-draggable element:", target);
            }
        });
        // Drop-Handler registrieren
        this.registerDropHandler();
    }
    registerDropHandler() {
        const markdownView = this.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView);
        if (markdownView) {
            const editorEl = markdownView.containerEl.querySelector(".markdown-source-view");
            if (editorEl) {
                const targetEditorEl = editorEl;
                this.registerDomEvent(targetEditorEl, "dragover", (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                });
                this.registerDomEvent(targetEditorEl, "drop", (evt) => {
                    const now = Date.now();
                    console.log("DEBUG: Drop triggered at:", now, "lastDropTime:", this.lastDropTime, "Time since last drop:", now - this.lastDropTime);
                    if (now - this.lastDropTime < 500) {
                        return;
                    }
                    const questionText = evt.dataTransfer.getData("text/plain");
                    const dropId = this.lastDropId;
                    if (questionText && dropId) {
                        if (this.processedDrops.has(dropId)) {
                            return;
                        }
                        evt.preventDefault();
                        evt.stopPropagation();
                        this.lastDropTime = now;
                        this.processedDrops.add(dropId);
                        const currentMarkdownView = this.app.workspace.getActiveViewOfType(obsidian_1.MarkdownView);
                        if (currentMarkdownView) {
                            const editor = currentMarkdownView.editor;
                            const selection = editor.getSelection();
                            console.log("DEBUG: Current selection:", `"${selection}"`);
                            let insertText = `\n${questionText}\n`; // Frage als neuer Absatz
                            let newCursor;
                            if (selection.length > 0) {
                                // Text ist markiert: Auswahl ersetzen und Absatz erzwingen
                                const from = editor.getCursor("from");
                                const to = editor.getCursor("to");
                                editor.replaceRange(insertText, from, to);
                                newCursor = { line: from.line + 2, ch: 0 }; // Nach zwei neuen Zeilen
                            }
                            else {
                                // Keine Markierung: Am Ende der aktuellen Zeile einfügen
                                const cursor = editor.getCursor();
                                const currentLine = editor.getLine(cursor.line);
                                const insertPosition = { line: cursor.line, ch: currentLine.length };
                                const totalLines = editor.lineCount();
                                if (totalLines === 1 && currentLine.trim() === "") {
                                    // Dokument komplett leer: Keine Umbrüche davor nötig
                                    insertText = `${questionText}\n\n`;
                                    newCursor = { line: 1, ch: 0 };
                                }
                                else if (currentLine.trim() === "") {
                                    // Aktuelle Zeile leer: Keine Umbrüche davor nötig
                                    insertText = `${questionText}\n\n`;
                                    newCursor = { line: cursor.line + 1, ch: 0 };
                                }
                                else {
                                    // Zeile enthält Text: Voller Absatzabstand
                                    newCursor = { line: cursor.line + 2, ch: 0 };
                                }
                                console.log("DEBUG: Inserting at:", JSON.stringify(insertPosition));
                                editor.replaceRange(insertText, insertPosition);
                            }
                            editor.setCursor(newCursor);
                            console.log("DEBUG: Question inserted, new cursor at:", JSON.stringify(newCursor));
                        }
                        else {
                            console.log("DEBUG: No active MarkdownView found during drop");
                        }
                    }
                });
            }
        }
    }
    getViewType() {
        return VIEW_TYPE_STORY_QUESTIONS;
    }
    getDisplayText() {
        return t(this.plugin, "storyQuestions");
    }
    async onOpen() {
        console.log("DEBUG: onOpen called - Version 17 Stable");
        const container = this.containerEl;
        container.empty();
        container.addClass("story-questions-container");
        container.createEl("h4", { text: t(this.plugin, "storyQuestions") });
        try {
            this.prompts = await loadPrompts(this.plugin.app, this.plugin.settings.language);
            console.log("Prompts successfully loaded in onOpen:", JSON.stringify(this.prompts, null, 2));
            const filterDiv = container.createDiv({ cls: "filter-container" });
            new obsidian_1.Setting(filterDiv)
                .setName(t(this.plugin, "filterCategory"))
                .addDropdown((dropdown) => {
                dropdown.addOption("", "Alle");
                Object.keys(this.prompts).forEach(category => dropdown.addOption(category, category));
                dropdown.onChange((value) => {
                    console.log("Filter changed to:", value);
                    this.renderQuestions(this.questionsDiv, value);
                });
            });
            this.questionsDiv = container.createDiv({ cls: "questions-list" });
            this.renderQuestions(this.questionsDiv, "");
            const buttonDiv = container.createDiv({ cls: "button-container" });
            const randomButton = buttonDiv.createEl("button", { text: t(this.plugin, "randomQuestion") });
            randomButton.addEventListener("click", this.handleRandomClick.bind(this));
            const generateButton = buttonDiv.createEl("button", { text: t(this.plugin, "generateQuestions") });
            generateButton.addEventListener("click", this.handleGenerateClick.bind(this));
            // Neuer Button für Bearbeitungsansicht
            const editButton = buttonDiv.createEl("button", { text: t(this.plugin, "editQuestions") });
            editButton.addEventListener("click", () => new EditQuestionsModal(this.plugin).open());
        }
        catch (error) {
            console.error("Error in onOpen:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            container.createEl("p", { text: `Error: ${errorMessage}`, cls: "error-message" });
        }
    }
    async onClose() {
        console.log("DEBUG: onClose called");
    }
    renderQuestions(container, categoryFilter) {
        console.log("Rendering questions with filter:", categoryFilter);
        container.empty();
        Object.entries(this.prompts)
            .filter(([category]) => !categoryFilter || category === categoryFilter)
            .forEach(([category, questions]) => {
            container.createEl("h5", { text: category });
            questions.forEach(q => {
                const p = container.createEl("p", { text: q, cls: "draggable" });
                p.setAttribute("draggable", "true");
                p.addEventListener("dragstart", (evt) => {
                    evt.dataTransfer.setData("text/plain", q);
                    evt.dataTransfer.effectAllowed = "copy";
                    console.log("Dragging question:", q);
                });
            });
        });
    }
    handleRandomClick() {
        console.log("Random button clicked");
        this.showRandomQuestion(this.questionsDiv);
    }
    handleGenerateClick() {
        console.log("Generate button clicked");
        this.generateQuestions(this.questionsDiv);
    }
    async showRandomQuestion(container) {
        console.log("Showing one random question per category, prompts:", JSON.stringify(this.prompts, null, 2));
        container.empty();
        const categories = Object.keys(this.prompts);
        if (categories.length === 0) {
            console.log("No categories available in prompts");
            container.createEl("p", { text: "Keine Fragen verfügbar / No questions available", cls: "error-message" });
            return;
        }
        console.log("Categories found:", categories);
        categories.forEach(category => {
            const questions = this.prompts[category];
            console.log(`Processing category: ${category}, number of questions: ${questions.length}`);
            if (questions && questions.length > 0) {
                const randomIndex = Math.floor(Math.random() * questions.length);
                const randomQuestion = questions[randomIndex];
                console.log(`Selected question for ${category}: ${randomQuestion}`);
                // Kategorieüberschrift anzeigen
                container.createEl("h5", { text: category });
                // Zufällige Frage mit gleichem Stil wie generierte Fragen anzeigen
                const p = container.createEl("p", { text: randomQuestion, cls: "ai-question draggable" });
                p.setAttribute("draggable", "true");
                p.addEventListener("dragstart", (evt) => {
                    evt.dataTransfer.setData("text/plain", `${category}: ${randomQuestion}`);
                    evt.dataTransfer.effectAllowed = "copy";
                    console.log("Dragging random question:", `${category}: ${randomQuestion}`);
                });
            }
            else {
                console.log(`No valid questions for category: ${category}`);
                container.createEl("p", { text: `${category}: Keine Fragen verfügbar / No questions available`, cls: "error-message" });
            }
        });
    }
    async generateQuestions(container) {
        console.log("Generating questions with forced variety");
        container.empty();
        const loadingDiv = container.createDiv({ cls: "loading-indicator" });
        loadingDiv.createEl("span", { cls: "spinner" });
        loadingDiv.createEl("span", { text: t(this.plugin, "generating"), cls: "loading-text" });
        const activeFile = this.app.workspace.getActiveFile();
        let content = "No content available";
        let fileName = "unknown";
        if (activeFile) {
            content = await this.app.vault.read(activeFile);
            fileName = activeFile.basename;
            // Only use a portion of the content if it's very long
            if (content.length > 5000) {
                // Use a different part of the content each time
                const startPos = Math.floor(Math.random() * (content.length - 5000));
                content = content.substring(startPos, startPos + 5000);
                console.log(`Content truncated to 5000 chars starting at position ${startPos}`);
            }
        }
        // Add metadata about the request to force different context
        const timestamp = Date.now();
        const requestId = Math.random().toString(36).substring(2, 15);
        // This helps ensure the AI sees a slightly different context each time
        const contentWithMetadata = `
  Document: ${fileName}
  Time: ${new Date(timestamp).toISOString()}
  Request ID: ${requestId}
  
  ${content}`;
        console.log(`Generating questions with request ID: ${requestId}`);
        const questions = await generateAIQuestions(contentWithMetadata, this.plugin.settings);
        loadingDiv.remove();
        const headerDiv = container.createDiv({ cls: "ai-questions-header" });
        headerDiv.createEl("h5", { text: "AI-generated Questions" });
        const refreshButton = headerDiv.createEl("button", { cls: "refresh-button" });
        refreshButton.innerHTML = "↻";
        refreshButton.title = t(this.plugin, "refresh");
        // Use a function to handle click to avoid reusing cached questions
        const handleRefreshClick = () => {
            console.log("Refresh button clicked, generating new questions");
            this.generateQuestions(container);
        };
        refreshButton.addEventListener("click", handleRefreshClick);
        questions.forEach(q => {
            const p = container.createEl("p", { text: q, cls: "ai-question draggable" });
            p.setAttribute("draggable", "true");
            p.addEventListener("dragstart", (evt) => {
                evt.dataTransfer.setData("text/plain", q);
                evt.dataTransfer.effectAllowed = "copy";
                console.log("Dragging AI question:", q);
            });
        });
    }
}
class EditQuestionsModal extends obsidian_1.Modal {
    constructor(plugin) {
        super(plugin.app);
        this.plugin = plugin;
        this.prompts = {};
        this.tabContainer = document.createElement("div"); // Initialisierung im Konstruktor
        this.contentContainer = document.createElement("div"); // Initialisierung im Konstruktor
    }
    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("edit-questions-container");
        this.prompts = await loadPrompts(this.plugin.app, this.plugin.settings.language);
        contentEl.createEl("h4", { text: "Kategorien und Fragen bearbeiten" });
        const addCategoryButton = contentEl.createEl("button", { text: "Neue Kategorie hinzufügen" });
        addCategoryButton.addEventListener("click", () => this.addCategory());
        this.tabContainer = contentEl.createDiv({ cls: "nav-tabs" });
        this.contentContainer = contentEl.createDiv({ cls: "tab-content" });
        Object.keys(this.prompts).forEach((category, index) => {
            const tab = this.tabContainer.createEl("button", {
                text: category,
                cls: `nav-tab ${index === 0 ? "active" : ""}`,
            });
            const tabContent = this.contentContainer.createDiv({
                cls: `tab-pane ${index === 0 ? "active" : ""}`,
            });
            const questionList = tabContent.createEl("ul", { cls: "question-list" });
            this.renderQuestions(category, questionList);
            const buttonContainer = tabContent.createDiv({ cls: "button-container" });
            const addButton = buttonContainer.createEl("button", { text: "Neue Frage hinzufügen" });
            addButton.addEventListener("click", () => this.addQuestion(category, questionList));
            const deleteCategoryButton = buttonContainer.createEl("button", { text: "Kategorie löschen" });
            deleteCategoryButton.addEventListener("click", () => this.deleteCategory(category, tab, tabContent));
            tab.addEventListener("click", () => {
                this.tabContainer.querySelectorAll(".nav-tab").forEach((t) => t.removeClass("active"));
                this.contentContainer.querySelectorAll(".tab-pane").forEach((p) => p.removeClass("active"));
                tab.addClass("active");
                tabContent.addClass("active");
            });
        });
    }
    renderQuestions(category, list) {
        list.empty();
        this.prompts[category].forEach((question, index) => {
            const li = list.createEl("li", { cls: "question-item" });
            const textSpan = li.createSpan({ text: question });
            const editIcon = li.createEl("span", { cls: "edit-icon", text: "✏️" });
            editIcon.addEventListener("click", () => this.editQuestion(category, index, textSpan, li));
            const deleteIcon = li.createEl("span", { cls: "delete-icon", text: "🗑️" });
            deleteIcon.addEventListener("click", () => this.deleteQuestion(category, index, li));
        });
    }
    async editQuestion(category, index, span, li) {
        const inputContainer = li.createDiv({ cls: "edit-input-container" });
        const textarea = inputContainer.createEl("textarea", {
            cls: "edit-input",
        });
        textarea.value = this.prompts[category][index];
        const saveButton = inputContainer.createEl("button", { text: "Speichern" });
        const cancelButton = inputContainer.createEl("button", { text: "Abbrechen" });
        span.style.display = "none";
        const editIcon = li.querySelector(".edit-icon");
        const deleteIcon = li.querySelector(".delete-icon");
        if (editIcon)
            editIcon.style.display = "none";
        if (deleteIcon)
            deleteIcon.style.display = "none";
        saveButton.addEventListener("click", async () => {
            const newText = textarea.value.trim();
            if (newText && newText !== this.prompts[category][index]) {
                this.prompts[category][index] = newText;
                span.setText(newText);
                await savePrompts(this.plugin.app, this.plugin.settings.language, this.prompts);
                this.plugin.refreshStoryQuestionsView();
            }
            inputContainer.remove();
            span.style.display = "";
            if (editIcon)
                editIcon.style.display = "";
            if (deleteIcon)
                deleteIcon.style.display = "";
        });
        cancelButton.addEventListener("click", () => {
            inputContainer.remove();
            span.style.display = "";
            if (editIcon)
                editIcon.style.display = "";
            if (deleteIcon)
                deleteIcon.style.display = "";
        });
        textarea.focus();
    }
    async deleteQuestion(category, index, li) {
        const confirmContainer = li.createDiv({ cls: "confirm-container" });
        confirmContainer.createSpan({ text: "Diese Frage wirklich löschen?" });
        const yesButton = confirmContainer.createEl("button", { text: "Ja" });
        const noButton = confirmContainer.createEl("button", { text: "Nein" });
        yesButton.addEventListener("click", async () => {
            this.prompts[category].splice(index, 1);
            li.remove();
            await savePrompts(this.plugin.app, this.plugin.settings.language, this.prompts);
            this.plugin.refreshStoryQuestionsView();
        });
        noButton.addEventListener("click", () => {
            confirmContainer.remove();
        });
    }
    async addQuestion(category, list) {
        const inputContainer = list.createDiv({ cls: "add-input-container" });
        const textarea = inputContainer.createEl("textarea", {
            placeholder: "Neue Frage eingeben",
            cls: "add-input",
        });
        const saveButton = inputContainer.createEl("button", { text: "Hinzufügen" });
        const cancelButton = inputContainer.createEl("button", { text: "Abbrechen" });
        saveButton.addEventListener("click", async () => {
            const newQuestion = textarea.value.trim();
            if (newQuestion) {
                this.prompts[category].push(newQuestion);
                this.renderQuestions(category, list);
                await savePrompts(this.plugin.app, this.plugin.settings.language, this.prompts);
                this.plugin.refreshStoryQuestionsView();
            }
            inputContainer.remove();
        });
        cancelButton.addEventListener("click", () => {
            inputContainer.remove();
        });
        textarea.focus();
    }
    async addCategory() {
        const inputContainer = this.contentEl.createDiv({ cls: "add-input-container" });
        const input = inputContainer.createEl("input", {
            type: "text",
            placeholder: "Neue Kategorie eingeben",
            cls: "add-input",
        });
        const saveButton = inputContainer.createEl("button", { text: "Hinzufügen" });
        const cancelButton = inputContainer.createEl("button", { text: "Abbrechen" });
        saveButton.addEventListener("click", async () => {
            const categoryName = input.value.trim();
            if (categoryName && !this.prompts[categoryName]) {
                this.prompts[categoryName] = [];
                const newTab = this.tabContainer.createEl("button", {
                    text: categoryName,
                    cls: "nav-tab",
                });
                const newTabContent = this.contentContainer.createDiv({
                    cls: "tab-pane",
                });
                const questionList = newTabContent.createEl("ul", { cls: "question-list" });
                this.renderQuestions(categoryName, questionList);
                const buttonContainer = newTabContent.createDiv({ cls: "button-container" });
                const addButton = buttonContainer.createEl("button", { text: "Neue Frage hinzufügen" });
                addButton.addEventListener("click", () => this.addQuestion(categoryName, questionList));
                const deleteCategoryButton = buttonContainer.createEl("button", { text: "Kategorie löschen" });
                deleteCategoryButton.addEventListener("click", () => this.deleteCategory(categoryName, newTab, newTabContent));
                newTab.addEventListener("click", () => {
                    this.tabContainer.querySelectorAll(".nav-tab").forEach((t) => t.removeClass("active"));
                    this.contentContainer.querySelectorAll(".tab-pane").forEach((p) => p.removeClass("active"));
                    newTab.addClass("active");
                    newTabContent.addClass("active");
                });
                this.tabContainer.querySelectorAll(".nav-tab").forEach((t) => t.removeClass("active"));
                this.contentContainer.querySelectorAll(".tab-pane").forEach((p) => p.removeClass("active"));
                newTab.addClass("active");
                newTabContent.addClass("active");
                await savePrompts(this.plugin.app, this.plugin.settings.language, this.prompts);
                this.plugin.refreshStoryQuestionsView();
                inputContainer.remove();
            }
            else if (categoryName && this.prompts[categoryName]) {
                this.contentEl.createEl("p", { text: "Diese Kategorie existiert bereits!", cls: "error-message" });
            }
            else {
                this.contentEl.createEl("p", { text: "Bitte einen Kategorienamen eingeben!", cls: "error-message" });
            }
        });
        cancelButton.addEventListener("click", () => {
            inputContainer.remove();
        });
        input.focus();
    }
    async deleteCategory(category, tab, tabContent) {
        const confirmContainer = this.contentEl.createDiv({ cls: "confirm-container" });
        confirmContainer.createSpan({ text: `Möchten Sie die Kategorie "${category}" wirklich löschen? Alle Fragen werden entfernt.` });
        const yesButton = confirmContainer.createEl("button", { text: "Ja" });
        const noButton = confirmContainer.createEl("button", { text: "Nein" });
        yesButton.addEventListener("click", async () => {
            delete this.prompts[category];
            tab.remove();
            tabContent.remove();
            await savePrompts(this.plugin.app, this.plugin.settings.language, this.prompts);
            this.plugin.refreshStoryQuestionsView();
            const firstTab = this.contentEl.querySelector(".nav-tab");
            const firstTabContent = this.contentEl.querySelector(".tab-pane");
            if (firstTab && firstTabContent) {
                this.contentEl.querySelectorAll(".nav-tab").forEach((t) => t.removeClass("active"));
                this.contentContainer.querySelectorAll(".tab-pane").forEach((p) => p.removeClass("active"));
                firstTab.addClass("active");
                firstTabContent.addClass("active");
            }
            confirmContainer.remove();
        });
        noButton.addEventListener("click", () => {
            confirmContainer.remove();
        });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
class StoryQuestionsSettingTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: t(this.plugin, "settingsTitle") });
        // Hugging Face API Key
        new obsidian_1.Setting(containerEl)
            .setName(t(this.plugin, "huggingFaceApiKey"))
            .setDesc(t(this.plugin, "huggingFaceApiKeyDesc"))
            .addText(text => text
            .setPlaceholder("hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
            .setValue(this.plugin.settings.apiKey)
            .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
        }));
        // OpenAI API Key
        new obsidian_1.Setting(containerEl)
            .setName(t(this.plugin, "openaiApiKey"))
            .setDesc(t(this.plugin, "openaiApiKeyDesc"))
            .addText(text => text
            .setPlaceholder("sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
            .setValue(this.plugin.settings.openaiApiKey)
            .onChange(async (value) => {
            this.plugin.settings.openaiApiKey = value;
            await this.plugin.saveSettings();
        }));
        // Claude API Key
        new obsidian_1.Setting(containerEl)
            .setName(t(this.plugin, "claudeApiKey"))
            .setDesc(t(this.plugin, "claudeApiKeyDesc"))
            .addText(text => text
            .setPlaceholder("sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
            .setValue(this.plugin.settings.claudeApiKey)
            .onChange(async (value) => {
            this.plugin.settings.claudeApiKey = value;
            await this.plugin.saveSettings();
        }));
        // Google API Key
        new obsidian_1.Setting(containerEl)
            .setName(t(this.plugin, "googleApiKey"))
            .setDesc(t(this.plugin, "googleApiKeyDesc"))
            .addText(text => text
            .setPlaceholder("AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
            .setValue(this.plugin.settings.googleApiKey)
            .onChange(async (value) => {
            this.plugin.settings.googleApiKey = value;
            await this.plugin.saveSettings();
        }));
        // AI Model Selection
        new obsidian_1.Setting(containerEl)
            .setName(t(this.plugin, "aiModel"))
            .setDesc(t(this.plugin, "aiModelDesc"))
            .addDropdown(dropdown => dropdown
            // Hugging Face Modelle
            .addOption("mixtral", "Mixtral 8x7B (Hugging Face)")
            .addOption("Westlake-7B", "Westlake-7B (Hugging Face)")
            .addOption("qwen", "Qwen 2.5 72B (Hugging Face)")
            .addOption("hermeo-7b", "malteos/hermeo-7b (Hugging Face)")
            // OpenAI Modelle
            .addOption("gpt4", "GPT-4 Turbo (OpenAI)")
            .addOption("gpt35", "GPT-3.5 Turbo (OpenAI)")
            // Claude Modelle
            .addOption("claude3opus", "Claude 3 Opus (Anthropic)")
            .addOption("claude3sonnet", "Claude 3 Sonnet (Anthropic)")
            .addOption("claude3haiku", "Claude 3 Haiku (Anthropic)")
            // Google Modelle
            .addOption("gemini", "Gemini Pro (Google)")
            .addOption("geminiultra", "Gemini Ultra (Google)")
            .setValue(this.plugin.settings.aiModel)
            .onChange(async (value) => {
            this.plugin.settings.aiModel = value;
            await this.plugin.saveSettings();
        }));
        // Language selection (unchanged)
        new obsidian_1.Setting(containerEl)
            .setName(t(this.plugin, "language"))
            .setDesc(t(this.plugin, "languageDesc"))
            .addDropdown(dropdown => dropdown
            .addOption("de", "Deutsch")
            .addOption("en", "English")
            .setValue(this.plugin.settings.language)
            .onChange(async (value) => {
            if (value === "de" || value === "en") {
                this.plugin.settings.language = value;
                await this.plugin.saveSettings();
                this.display();
                this.refreshView();
            }
        }));
        // Refresh button (unchanged)
        new obsidian_1.Setting(containerEl)
            .setName(t(this.plugin, "refresh"))
            .setDesc("Refresh the plugin view.")
            .addButton(button => button
            .setButtonText(t(this.plugin, "refresh"))
            .onClick(() => this.refreshView()));
    }
    refreshView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_STORY_QUESTIONS);
        leaves.forEach(leaf => {
            if (leaf.view instanceof StoryQuestionsView) {
                leaf.view.onOpen();
            }
        });
    }
}
class StoryQuestionsPlugin extends obsidian_1.Plugin {
    constructor() {
        super(...arguments);
        this.settings = DEFAULT_SETTINGS;
    }
    async onload() {
        await this.loadSettings();
        this.addRibbonIcon("dice", "Story Questions", () => {
            this.activateView(VIEW_TYPE_STORY_QUESTIONS);
        });
        this.registerView(VIEW_TYPE_STORY_QUESTIONS, (leaf) => new StoryQuestionsView(leaf, this));
        this.addCommand({
            id: "open-story-questions",
            name: "Open Story Questions",
            callback: () => this.activateView(VIEW_TYPE_STORY_QUESTIONS),
        });
        this.addSettingTab(new StoryQuestionsSettingTab(this.app, this));
        // CSS direkt einfügen
        this.app.workspace.onLayoutReady(() => {
            const style = document.createElement("style");
            style.textContent = `
        /* CSS hier */
      `;
            document.head.appendChild(style);
        });
    }
    async activateView(viewType) {
        const leaves = this.app.workspace.getLeavesOfType(viewType);
        let leaf;
        if (leaves.length === 0) {
            const newLeaf = this.app.workspace.getRightLeaf(false);
            if (newLeaf) {
                leaf = newLeaf;
                await leaf.setViewState({ type: viewType, active: true });
            }
            else {
                console.error("Could not create a new leaf for view:", viewType);
                return;
            }
        }
        else {
            leaf = leaves[0];
        }
        this.app.workspace.revealLeaf(leaf);
    }
    refreshStoryQuestionsView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_STORY_QUESTIONS);
        leaves.forEach(leaf => {
            if (leaf.view instanceof StoryQuestionsView) {
                leaf.view.onOpen();
            }
        });
    }
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        console.log("Settings loaded:", this.settings);
    }
    async saveSettings() {
        await this.saveData(this.settings);
        console.log("Settings saved:", this.settings);
    }
}
exports.default = StoryQuestionsPlugin;
