Required Software & Downloads
1.	Node.js (version 16+ recommended)
o	Download and install.
o	Required to run the backend (Node + Express) and install dependencies.
2.	npm (bundled with Node) or yarn
o	Used to install libraries like express, cors, pg (for the backend) and React (for the frontend).
3.	Git (optional, but recommended)
o	Helpful for cloning/pushing the project to GitHub.
4.	SSH Tunnel Script (if off‐campus)
o	E.g., tunnel_scripta.bat on Windows, forwarding localhost:9999 to the remote DB server’s 5432.
5.	(Optional) DBeaver
o	For managing/inspecting the database visually, if desired.
________________________________________
Steps to Install & Run
1) Backend (Node)
1.	Open a terminal in the backend/ folder.
2.	Run npm install to install backend dependencies (express, pg, dotenv, etc.).
3.	Create a .env file in backend/ with your DB credentials:
ini
CopyEdit
DB_HOST=localhost
DB_PORT=9999           # or 5432 if direct
DB_NAME=db_202425z_va_prj_blisscoredb
DB_USER=db_202425z_va_prj_blisscoredb_owner
DB_PASS=a0bd24e328ff
o	Add .env to .gitignore so it’s not committed to GitHub.
4.	If off‐campus, start your SSH tunnel (tunnel_scripta.bat) and leave it open.
5.	Run npm start (or node index.js) to launch the backend on http://localhost:5000.
2) Frontend (React)
1.	Open a terminal in the frontend/ folder.
2.	Run npm install to install React and dependencies.
3.	Run npm start to launch the dev server on http://localhost:3000.
________________________________________
Access the Application
•	Open your browser at http://localhost:3000 to see the React app.
•	When you register a user, or register for an event, React calls the Node endpoints (e.g., /api/register-student) at port 5000, and the Node server in turn connects to the university’s PostgreSQL database (on campus or via the SSH tunnel).

