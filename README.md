# Complaint Ticketing System

This repository currently contains the backend work completed so far for the Complaint / Ticketing System project.

## Current backend features available

- user register/login
- JWT authentication
- role-based protected APIs
- ticket creation
- priority/category validation
- ticket status flow
- SLA due date calculation
- escalation API
- comments API base

# Backend setup instructions

1. Things needed first

---

Before running the backend, make sure you have:

- Python installed
- ODBC Driver 18 for SQL Server installed
- access to the Azure account using your company mail
- access to the Azure SQL server `ticket-server-sls`
- the backend `.env` values shared on Teams

2. Install ODBC Driver 18

---

You must install:

- ODBC Driver 18 for SQL Server

Without this, Azure SQL connection will not work from Python.

3. Azure access and firewall setup

---

To connect the backend to Azure SQL:

1. Login to Azure using your company mail.
2. Open the Azure portal.
3. Select the SQL server:
   - `ticket-server-sls`
4. Also make sure the database is:
   - `ticket_db`
5. Open `ticket-server-sls`
6. In the left panel, go to:
   - `Security`
7. Then open:
   - `Networking`
8. In firewall rules, add your current public IP.
9. Save the firewall changes.

If your IP is not added, the backend will not be able to connect to Azure SQL.

4. Create the backend .env file

---

Create this file:

- `backend/.env`

The values for the `.env` file will be shared on Teams chat.

Expected keys in `.env`:

```env
APP_NAME=Complaint Ticketing System API
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000

JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

AZURE_SQL_SERVER=ticket-server-sls.database.windows.net
AZURE_SQL_DATABASE=ticket_db
AZURE_SQL_USERNAME=your-username
AZURE_SQL_PASSWORD=your-password
AZURE_SQL_DRIVER=ODBC Driver 18 for SQL Server
AZURE_SQL_ENCRYPT=yes
AZURE_SQL_TRUST_CERT=no
```

Do not commit personal or changed credentials publicly.

Please create a virtual environment in the backend folder

5. Create and activate virtual environment

---

Open terminal in:

```powershell
cd Complaint-Ticketing-Sys\backend
```

Create virtual environment:

```powershell
python -m venv venv
```

Activate it:

```powershell
.\venv\Scripts\Activate.ps1
```

6. Install backend dependencies

---

Run:

```powershell
pip install -r requirements.txt
```

7. Run the backend

---

From inside the `backend` folder, run:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

If it starts correctly, open:

- Swagger docs: `http://127.0.0.1:8000/docs`
