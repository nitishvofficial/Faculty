
Slide 1 – Title
Academic Monitor Ecosystem
AI-Based Smart Attendance Management System
Components

Student Mobile Application

Faculty Mobile Application

Admin Web Application

Supabase Cloud Backend

ERP Automation Bot

Objective: To provide a secure, automated, and scalable attendance management system using AI and BLE technology.

Slide 2 – Problem Statement
Existing Attendance Problems
Manual attendance is time-consuming.

Proxy attendance is common.

Human errors during attendance.

Paper-based records are difficult to maintain.

Manual ERP entry consumes faculty time.

No centralized attendance monitoring.

Proposed Solution
Develop a smart attendance ecosystem using:

Face Recognition

Bluetooth Low Energy (BLE)

OTP Verification

Cloud Database

ERP Automation

Slide 3 – Solution Overview
The Academic Monitor Ecosystem consists of:

Student Mobile App – Verifies student identity and marks attendance.

Faculty Mobile App – Creates attendance sessions and validates students.

Admin Web Application – Manages users, attendance records, analytics, and ERP uploads.

Supabase Backend – Central database and storage.

ERP Automation Bot – Automatically updates attendance in the college ERP.

Key Benefits

Secure attendance

Faster process

Reduced proxy attendance

Centralized management

Automated ERP integration

Slide 4 – System Architecture
                Academic Monitor Ecosystem

            Student Mobile Application
                     │
                     │ BLE + OTP
                     ▼
            Faculty Mobile Application
                     │
                     ▼
              Supabase Backend
     ┌─────────────┼─────────────┐
     │             │             │
 Students      Attendance     Faculty
 Database       Records       Database
                     │
                     ▼
          Admin Web Dashboard
                     │
                     ▼
             ERP Automation Bot
                     │
                     ▼
              College ERP Portal
Slide 5 – Technology Stack
Frontend
React Native

TypeScript

React Navigation

Reanimated

Lottie

Backend
Supabase

PostgreSQL

Supabase Storage

Authentication

AI & Recognition
TensorFlow Lite

MobileFaceNet

ML Kit Face Detection

Communication
Bluetooth Low Energy (BLE)

OTP Verification

Automation
Playwright

Node.js

TypeScript

Slide 6 – Student Mobile Application
Workflow
Student opens the application.

Face Recognition verifies identity.

App scans nearby faculty sessions using BLE.

Student selects the required session.

BLE connection is established.

Student enters OTP displayed by faculty.

OTP is verified.

Attendance is confirmed.

Features
Face Verification

BLE Session Discovery

OTP Authentication

Attendance Confirmation

Secure Attendance Process

Slide 7 – Faculty Mobile Application
Workflow
Faculty logs in through Face Recognition.

Timetable is loaded automatically.

Faculty starts attendance session.

BLE session starts broadcasting.

OTP is generated.

Students connect and verify.

Faculty monitors verified students.

Attendance session is closed.

Attendance records are generated.

Features
Face Authentication

Session Management

Live Student Verification

OTP Generation

Attendance Monitoring

CSV Generation

Slide 8 – Admin Web Application & Database
Admin Functions
Student Management

Faculty Management

Attendance Monitoring

Reports & Analytics

CSV Management

ERP Upload Monitoring

Supabase Database
Main Tables:

Students

Faculties

Attendance Sessions

Attendance Records

Attendance CSV Records

Acts as the single source of truth for all applications.

Slide 9 – Attendance Workflow
Faculty Login
      │
Face Verification
      │
Attendance Session Created
      │
BLE Broadcast Started
      │
Student Face Verification
      │
BLE Connection
      │
OTP Verification
      │
Attendance Confirmed
      │
Attendance Stored in Supabase
      │
CSV Generated
      │
ERP Automation
Slide 10 – Security Features
Multi-Level Security
Face Recognition

Verifies faculty and student identity.

Bluetooth Low Energy (BLE)

Ensures the student is physically near the faculty.

OTP Verification

Confirms participation in the active class session.

Additional Security
Unique Attendance Session IDs

Duplicate Attendance Prevention

Cloud-Based Data Storage

Centralized User Management

Slide 11 – Key Features & Advantages
Features
AI-Based Face Recognition

BLE Communication

OTP-Based Authentication

Real-Time Attendance

Centralized Database

Admin Dashboard

Automated CSV Reports

ERP Integration

Cloud Synchronization

Scalable Architecture

Advantages
Eliminates proxy attendance

Saves faculty time

Reduces manual work

Improves attendance accuracy

Easy to monitor and manage

Suitable for colleges and universities

Slide 12 – Results & Future Scope
Achievements
Automated attendance process

Secure multi-layer verification

Real-time attendance monitoring

Centralized administration

ERP automation support

Reduced manual intervention

Future Scope
Multi-campus deployment

AI-based attendance analytics

QR/NFC integration

Parent notification system

Real-time dashboards

Cloud scalability for large institutions

Slide 13 – Conclusion
Conclusion
Academic Monitor is an AI-powered smart attendance ecosystem that integrates Student Mobile Application, Faculty Mobile Application, Admin Web Application, Supabase Cloud Backend, and ERP Automation into a unified platform.

By combining Face Recognition, BLE, OTP Verification, and Cloud Computing, the system provides:

Secure attendance

Fast verification

Accurate record management

Centralized administration

Automated ERP integration

The solution is scalable, reliable, and designed to meet the attendance management needs of modern educational institutions.

Slide 14 – Thank You
Thank You
Questions & Discussion

"Smart Attendance Through AI, Secure Communication, and Intelligent Automation."
see include this and give propoer prompt it was deviating and wasting tokens

