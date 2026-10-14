# PHOTOVI

## Software Requirements Specification

**Version 1.0**

**Subject:** System Testing and Quality Assurance

**Group:** Fantastic4

**Members:**
- Lawrence Brian Dejan
- Neoh Del Prado
- Juliamay Nina Estrada
- Kyle Tristan Turno

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 08/26/2026 | 1.0 | Software Requirements Specification | Fantastic4 |

---

## Table of Contents

1. Introduction
   - 1.1 Purpose
   - 1.2 Scope
   - 1.3 Definitions, Acronyms, and Abbreviations
   - 1.4 References
2. Overview Overall Description
3. Specific Requirements
   - 3.1 Functionality
   - 3.2 Usability
   - 3.3 Reliability & Availability
   - 3.4 Performance
   - 3.5 Security
   - 3.6 Supportability
   - 3.7 Design Constraints
   - 3.8 Online User Documentation and Help System Requirements
   - 3.9 Purchased Components
   - 3.10 Interfaces
   - 3.11 Licensing Requirements
   - 3.12 Legal, Copyright, and Other Notices
   - 3.13 Applicable Standards
4. Supporting Information

---

## 1. Introduction

PHOTOVI is a browser based digital photo booth built for human interactivity recreating the fun and naturalness of a real photobooth, the kind you see at the mall, birthday parties, arcades and other events but brings an entire experience online directly into a web browser with nothing to install and no account to create. This document serves as the Software Requirements Specification (SRS) meant for PHOTOVI, a digital photo-visual studio. The idea behind PHOTOVI came from the team's observation, it should be fun, interactive and styled based on the user's liking, Its either you track down physical photobooth somewhere or download an application that takes up storage, sign up account and settle for whatever limited features the free version can provide. A user simply opens a website, turns on the camera, and within a short span of second they're previewing filters live and getting ready to download their photo strip with no logins, no waiting.

At its main feature, it describes how PHOTOVI needs to do and it should behave from the moment user allowed camera access to the moment they start the capturing the system must lists all the features, the kind of experience it should provide and importantly the limit of what PHOTOVI will not do for example, it will not store photos on server, requires user to login or depend on any paid service. Everything is designed to run locally and using only tools that are already built into mode browsers.

### 1.1 Purpose

The main purpose of this document is to describe what PHOTOVI can do, should do and how it should behave once it's built and ready for testing. It shows every important feature of the system, it should give users each step of the process and sets a limits on what the system will and will not do. This SRS spells out the real purpose of the system in terms of interactivity, purpose and importance in making photo capturing less hassle to users.

This serves as a guide to the developers building PHOTOVI acting as shared reference about how a certain feature should work, what it should look like or what happens when encountering errors such as identifying camera access. Having this documented means the team are not relying on assumptions about what was agreed earlier, the solution is simply recorded here in detail for everyone to check. This also gives our main developer a clear and honest picture of what the rest of the team is proposing before the development starts. As part of the requirements meant to show what PHOTOVI will look on the surface and behind why certain features exists, why the system is designed that way and how it is fits within the project constraints of the activity such as using HTML, CSS, JavaScript, with no database involved.

The SRS exists to prevent any issue by writing down the requirements in detail; through this, the development team can ensure that PHOTOVI is able to provide a consistent, reliable, and enjoyable experience to every user who opens it, regardless of which member of the group worked on that particular feature.

### 1.2 Scope

Getting a fun, styled photobooth-style picture normally finding a physical booth at an event or downloading a separate app, creating an account, and settling for limited free filters. PHOTOVI's scope is to make that entire experience instant and accessible from any browser, with no installation or signup required. The PHOTOVI covers:

- Streaming a live camera preview straight to the browser.
- Letting the user apply a filter and preview it live, before any photo is taken.
- Letting the user choose how many photos to take in one session (for example, 3 or 4).
- Running a countdown before each photo is captured.
- Arranging all the captured photos into one vertical strip, styled like a printed photobooth strip.
- Letting the user download the finished strip as a single image.

PHOTOVI will be built using only HTML, CSS, and JavaScript, using browser-native features (the camera, the canvas drawing surface, and audio playback) rather than any outside server. The system will not use a database, and it will not require the user to log in or create an account. No photos are uploaded anywhere, everything happens locally, in the user's own browser session.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Meaning |
|------|---------|
| UI | User Interface - the parts of the website the user sees and interacts with. |
| UX | User Experience - how easy and pleasant the website is to use. |
| DOM | Document Object Model - the structure JavaScript uses to change what's shown on the web page. |
| getUserMedia | A browser feature that asks the user for permission to use their camera or microphone and gives the website access to that live video/audio feed. |
| MediaDevices API | The browser API family that getUserMedia belongs to, used for accessing cameras. |
| Canvas API | A browser feature that lets JavaScript draw and edit images directly on the page - used here for filters and combining photos into a strip. |
| Web Audio API | A browser feature for playing and controlling sound, used here for the shutter and countdown sounds. |
| SRS | Software Requirements Specification this document. |

### 1.4 References

- PHOTOVI Project Proposal (Part of this same Interactive Media activity).
- MediaDevices.getUserMedia() documentation.
- Canvas API documentation.
- Web Audio API documentation.
- Class Resources - SRS templates/examples folder provided by the instructor.

### 1.5 Overview

The rest of the SRS document is organized as follows: Section gives a general description of the project PHOTOVI and who are the beneficiary users. Section 3 will include specific requirements of the system, what it must do (functionality), how user should feel while using the system (usability), how dependable the system should be (reliability), how fast the system when it comes to responsiveness (performance), how it should keep users safe (security) and technical rules it should follow from the available software and hardware present (constraints and interfaces). Section 4 shows supporting documents related to PHOTOVI SRS.

---

## 2. Overall Description

PHOTOVI is developed as part of Interactive Media Development which requires the team to use HTML, CSS and JavaScript without relying on database. Within these constraints, the team focuses on recreating a familiar environment which they experienced from the physical photobooth and reimagining it as instant browser-based and accessible to anyone with a camera and internet.

Getting the same joyable experience from the traditional booth within an event or downloading a dedicated mobile application demands an account and only offer limited features. PHOTOVI is built to remove this barriers, it brings the entire photobooth experience to everyone's devices, allowing a user to go from opening their websites, to using their camera and editing an existing one with no software installation, no signup procedures and no account management needed. PHOTOVI then guides the user through the capture process automatically, running a visible countdown accompanied by an audio cue before each photo is taken, and repeating this cycle until the selected number of images has been captured. Once the session is complete, the system does not simply present the user with a set of separate, disconnected images. Instead the system provide easier editing and closely mirroring the appearance of a printed photobooth stall.

---

## 3. Specific Requirements

This section lists the detailed requirements of PHOTOVI, organized by category.

### 3.1 Functionality

This section lists what PHOTOVI must be able to do. Each requirement is written to explain all the main functionalities of the system.

#### 3.1.1 Live Camera Preview

- The system shall ask the user for permission to access their device's camera.
- The system shall display a live video feed from the camera directly on the page once permission is granted.

#### 3.1.2 Apply Filters in Real Time

- The system shall display a row of filter thumbnails the user can choose from.
- The system shall apply the selected filter to the live camera preview immediately, so the user can see exactly how their photo will look before capturing it.
- The system shall allow the user to switch between filters as many times as they like before starting the countdown.

#### 3.1.3 Select Number of Photos

- The system shall let the user choose how many photos will be taken in the session (for example, 3 or 4), similar to choosing a strip size at a real photobooth.
- The system shall clearly show the selected shot count before the session starts.

#### 3.1.4 Countdown Before Each Capture

- The system shall run a visible countdown before each photo is taken.
- The system shall play a countdown beep sound leading up to each capture.
- The system shall automatically repeat the countdown-and-capture process until it reaches the number of photos the user selected.

#### 3.1.5 Capture Each Photo

- The system shall capture a still image from the live filtered video feed at the end of each countdown.
- The system shall play a shutter sound effect at the moment each photo is captured.
- The system shall temporarily hold on to each captured photo in the browser until the full session is complete.

#### 3.1.6 Compose the Final Photo Strip

- The system shall arrange all captured photos into a single vertical strip once the session ends.
- The system shall add spacing and borders between each photo so the strip looks like a printed photobooth strip.
- The system shall include a spot for a date stamp on the finished strip.

#### 3.1.7 Download the Finished Strip

- The system shall provide a download button on the results screen.
- The system shall let the user save the finished photo strip as a single image file to their device.

#### 3.1.8 Handle Camera Permission Issues

- The system shall display a clear message if the user denies camera access, explaining that camera permission is required to use PHOTOVI.
- The system shall include simple instructions on how the user can enable camera access if they change their mind.

#### 3.1.9 Handle Filter Errors Gracefully

- The system shall fall back to the plain, unfiltered live feed if a filter fails to render, so the session is not interrupted.
- The system shall let the user continue choosing a different filter or proceeding without one after a filter error.

### 3.2 Usability

#### 3.2.1 Graphical User Interface

- The system shall show a centered live camera preview as the main focus of the screen.
- The system shall display a row of filter thumbnails below the live preview.
- The system shall show a clear results screen with the completed photo strip and a visible download button.
- The system shall use a clean, consistent design and readable fonts throughout, so the experience feels playful but simple to follow.

#### 3.2.2 Accessibility

- The system shall label all buttons and controls clearly, so their purpose is obvious without instructions.
- The system shall use text with enough contrast against its background to stay easy to read.
- The system shall keep the flow simple enough that a first-time user can complete a full photo session without a tutorial.

### 3.3 Reliability & Availability

#### 3.3.1 Browser & Device Compatibility

- The system shall remain usable on any device and browser that supports camera access, without depending on our own backend server.

#### 3.3.2 Local Processing Reliability

- The system shall not lose progress mid-session due to server issues, since the whole process runs locally in the browser.
- The system shall clearly recover from small errors (like a denied camera permission or a failed filter) by showing a message instead of freezing or crashing.

### 3.4 Performance

- The system shall load the main page and start the camera preview within a few seconds on a normal device and connection.
- The system shall apply filters to the live preview with minimal delay, so the preview still feels live.
- The system shall generate the final photo strip within a few seconds after the last photo is captured.

### 3.5 Security

#### 3.5.1 Camera Access Control

- The system shall only access the camera after the user explicitly grants permission through the browser.

#### 3.5.2 Data Privacy

- The system shall not upload, transmit, or store any captured photos on an external server — all processing shall happen locally in the browser.
- The system shall not collect or request any personal information from the user, such as names, emails, or passwords.
- The system shall not use cookies to track or identify individual users.

### 3.6 Supportability

#### 3.6.1 Code Organization

- The system's source code shall be organized into clear, separate files for HTML, CSS, and JavaScript so it is easy for group members to work on different parts.

#### 3.6.2 Version Control

- The system's code shall be kept in a shared repository (such as GitHub) so all group members can access and update it.

#### 3.6.3 Code Documentation

- The system's code shall include simple comments explaining what each major function does (such as filter rendering or strip compositing), to make it easier to maintain.

### 3.7 Design Constraints

#### 3.7.1 Technology Stack

- The system shall be built using only HTML5, CSS3, and vanilla JavaScript (no backend server code).
- The system shall not use a database of any kind — nothing about a session is saved after the browser tab is closed, unless the user downloads their strip.
- The system shall use the MediaDevices/getUserMedia API for camera access, the Canvas API for filters and compositing, and the Web Audio API for sound effects.

#### 3.7.2 Web-Based Requirements

- The system shall work in modern web browsers such as Chrome, Edge, and Firefox that support these browser APIs.
- The system shall require a secure connection, since browsers only allow camera access on secure pages.

### 3.8 Online User Documentation and Help System Requirements

- The system shall include short, on-screen instructions guiding the user through choosing a filter, picking a shot count, and starting the countdown.
- The system shall display a clear explanation and simple steps if camera access is denied, instead of a separate help manual, to keep things simple.

### 3.9 Purchased Components

Not applicable. PHOTOVI only uses built-in browser features (camera access, canvas drawing, and audio playback) and does not use any purchased or licensed software components.

### 3.10 Interfaces

PHOTOVI has three main types of interfaces: the interface the user sees, the hardware needed to use it, and the browser features (software interfaces) it depends on.

#### 3.10.1 User Interfaces

- The system's user interface shall be a responsive website accessible through any modern web browser.
- The system's user interface shall include a live camera preview, a filter thumbnail row, a shot-count selector, a start button, a countdown display, and a results screen with a download button.

#### 3.10.2 Hardware Interfaces

- The system shall require a device (phone, tablet, or computer) with a working camera.
- The system shall require the device to have working audio output to play the shutter and countdown sounds.

#### 3.10.3 Software Interfaces

- The system shall use the MediaDevices/getUserMedia API (built into the browser) to access the device's camera.
- The system shall use the Canvas API (built into the browser) to apply filters to the live feed and to compose the final photo strip.
- The system shall use the Web Audio API (built into the browser) to play the shutter sound and countdown beep.
- The system shall not require any external or third-party API, since all core features rely on features already built into the browser.

#### 3.10.4 Communications Interfaces

- The system shall be served over HTTPS, since browsers require a secure connection before allowing camera access.
- The system shall not send any photo or session data over the network, since all processing happens locally in the browser.

### 3.11 Licensing Requirements

Not applicable. PHOTOVI is a student project created for the Interactive Media subject and is not intended for commercial release.

### 3.12 Legal, Copyright, and Other Notices

- The system shall make clear to users that their photos stay on their own device and are not uploaded or stored anywhere by PHOTOVI.
- The system shall make clear to users that it is a student project and not an official or commercial photo booth product.
- The system shall not claim ownership of any photo the user captures using PHOTOVI.

### 3.13 Applicable Standards

- The system shall follow standard HTML5 and CSS3 web development practices.
- The system shall follow common JavaScript (ES6+) coding conventions for readability.
- The system shall aim to follow basic W3C accessibility guidelines where practical.
- The system shall follow the official browser specifications for the MediaDevices, Canvas, and Web Audio APIs.

---

## 4. Supporting Information

Please refer to the following related documents for this project:

- PHOTOVI Project Proposal (Part 1 of this Interactive Media activity).
- Class Resources folder - SRS templates and examples provided by the instructor.
