# Kubernetes Microservices Demo

A simple microservices application demonstrating Kubernetes deployment, service discovery, and ingress routing using a task management system.
And also CI/CD with Github Actions

## 📋 Project Overview

This project consists of three microservices (auth, users, tasks) and a React frontend, all deployed on Kubernetes using Minikube. The application allows users to create and view tasks, with authentication handled by a separate auth service.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Ingress (nginx)                  │
│              (myapp.local)                          │
└─────────────────────────────────────────────────────┘
         │              │              │
    /auth│         /users│        /tasks│
         │              │              │
         ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│Auth Service │  │User Service │  │Tasks Service│
│   (Port 80) │  │  (Port 8080)│  │ (Port 8000) │
└─────────────┘  └─────────────┘  └─────────────┘
                                          │
                                          │ Verifies tokens
                                          ▼
                                   ┌─────────────┐
                                   │Auth Service │
                                   └─────────────┘
         ▲
         │
    Frontend Service
    (React App - Port 80)
```

## 🛠️ Technologies Used

### Frontend
- **React** - UI framework
- **Nginx** - Static file server
- **Docker** - Containerization

### Backend Services
- **Node.js + Express** - REST API framework
- **Axios** - HTTP client for inter-service communication
- **Docker** - Containerization

### Infrastructure
- **Kubernetes** - Container orchestration
- **Minikube** - Local Kubernetes cluster
- **Docker Hub** - Container registry
- **Nginx Ingress Controller** - Traffic routing and load balancing

## 📦 Services

### 1. Auth Service
- **Port**: 80
- **Purpose**: Token verification and authentication
- **Endpoints**: 
  - `GET /verify-token/:token` - Verifies JWT tokens

### 2. Users Service
- **Port**: 8080
- **Purpose**: User management
- **Endpoints**: User CRUD operations

### 3. Tasks Service
- **Port**: 8000
- **Purpose**: Task management
- **Endpoints**:
  - `GET /tasks` - Fetch all tasks
  - `POST /tasks` - Create a new task
- **Storage**: File-based (tasks.txt)
- **Authentication**: Requires Bearer token in headers

### 4. Frontend Service
- **Port**: 80
- **Purpose**: React SPA for task management UI
- **Features**:
  - Create new tasks
  - View task list
  - Fetch tasks on demand

## 🚀 Getting Started

### Prerequisites
- Docker installed
- Minikube installed
- kubectl installed
- Docker Hub account (for pushing custom images)

### Setup Instructions

1. **Start Minikube**
```bash
minikube start
```

2. **Enable Ingress**
```bash
minikube addons enable ingress
```

3. **Build and Push Docker Images** (if modifying code)
```bash
# Auth service
cd auth-api
docker build -t aleksandromilenkov/kub-demo-auth:latest .
docker push aleksandromilenkov/kub-demo-auth:latest

# Users service
cd ../users-api
docker build -t aleksandromilenkov/kub-demo-users:latest .
docker push aleksandromilenkov/kub-demo-users:latest

# Tasks service
cd ../tasks-api
docker build -t aleksandromilenkov/kub-demo-tasks:latest .
docker push aleksandromilenkov/kub-demo-tasks:latest

# Frontend
cd ../frontend
docker build -t aleksandromilenkov/kub-demo-frontend:latest .
docker push aleksandromilenkov/kub-demo-frontend:latest
```

4. **Deploy to Kubernetes**
```bash
# Apply ConfigMap
kubectl apply -f kubernetes/configmap.yaml

# Deploy services
kubectl apply -f kubernetes/auth-deployment.yaml
kubectl apply -f kubernetes/auth-service.yaml

kubectl apply -f kubernetes/user-deployment.yaml
kubectl apply -f kubernetes/user-service.yaml

kubectl apply -f kubernetes/tasks-deployment.yaml
kubectl apply -f kubernetes/tasks-service.yaml

kubectl apply -f kubernetes/frontend-deployment.yaml
kubectl apply -f kubernetes/frontend-service.yaml

# Deploy Ingress
kubectl apply -f kubernetes/ingress.yaml
```

5. **Configure Local DNS**

Add to `/etc/hosts` (Linux/Mac) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
```
<minikube-ip> myapp.local
```

Get Minikube IP:
```bash
minikube ip
```

6. **Access the Application**
```
http://myapp.local
```

## 🔧 Configuration

### ConfigMap
The `configmap.yaml` stores service URLs for inter-service communication:
- `AUTH_SERVICE_URL`: Internal auth service URL
- `USER_SERVICE_URL`: Internal user service URL  
- `TASKS_SERVICE_URL`: Internal task service URL

### Ingress Routing

The ingress uses path-based routing with rewrite rules:

```yaml
/auth/*    → auth-service:80
/users/*   → user-service:8080
/tasks/*   → tasks-service:8000
/*         → frontend-service:80
```

## 🔐 Authentication Flow

1. Frontend sends request with Bearer token in Authorization header
2. Tasks service receives request
3. Tasks service calls Auth service to verify token
4. Auth service validates and returns user ID
5. Tasks service processes request if token is valid

## 📊 Kubernetes Resources

### Deployments
- `auth-deployment` - 1 replica
- `user-deployment` - 1 replica
- `tasks-deployment` - 1 replica
- `frontend-deployment` - 1 replica

### Services
- `auth-service` - NodePort (80)
- `user-service` - NodePort (8080)
- `tasks-service` - NodePort (8000)
- `frontend-service` - ClusterIP (80)

### ConfigMaps
- `app-config` - Service URLs and environment variables

### Ingress
- `app-ingress` - Nginx ingress with path-based routing

## 🐛 Troubleshooting

### Check Pod Status
```bash
kubectl get pods
kubectl logs <pod-name>
kubectl describe pod <pod-name>
```

### Check Services
```bash
kubectl get services
kubectl describe service <service-name>
```

### Check Ingress
```bash
kubectl get ingress
kubectl describe ingress app-ingress
```

### Force Image Pull
```bash
kubectl rollout restart deployment <deployment-name>
```

### Access Service Directly (Port Forwarding)
```bash
kubectl port-forward service/tasks-service 8000:8000
```

## 📝 Development Notes

### Service Communication
- Services communicate internally using Kubernetes DNS
- Format: `http://<service-name>:<port>`
- Example: `http://auth-service/verify-token/abc123`

### File Storage
The tasks service uses a simple file-based storage system:
- Tasks are appended to `tasks.txt`
- Each task is separated by `TASK_SPLIT` delimiter
- This is for demo purposes only (not production-ready)

### Frontend Build
The frontend is a static React build served by Nginx:
- Built files are copied to `/usr/share/nginx/html`
- Nginx configuration handles React Router routing
- API calls are proxied through ingress
  
## 🚀 CI/CD Pipeline (GitHub Actions)

This project includes a fully automated **CI/CD pipeline** built with **GitHub Actions**.  
It performs:

- Building & testing all microservices  
- Building the React frontend  
- Packaging all services into Docker images  
- Pushing images to Docker Hub  
- (Optional) Deploying to Minikube for testing  

---

## 🔄 Workflow Overview

The workflow file is located at:

```
.github/workflows/ci-cd.yml
```

It triggers on:

```yaml
on:
  push:
    branches: [ master, develop ]
  pull_request:
    branches: [ master ]
```

---

## 🧱 CI Stages

The pipeline is divided into multiple jobs that run in parallel when possible.

---

### 1️⃣ Frontend Build & Test

This job:

- Installs Node.js  
- Installs dependencies (`npm ci`)  
- Runs tests  
- Builds the React production bundle  
- Uploads the build output as an artifact  

This ensures the frontend builds cleanly before Docker packaging.

---

### 2️⃣ Backend Service Build & Test

There are three backend services:

- **Auth API**
- **Users API**
- **Tasks API**

Each one:

- Checks out the code  
- Installs dependencies  
- Runs optional tests  

This validates all services before creating Docker images.

---

## 🐳 3️⃣ Docker Build & Push (Matrix Strategy)

Once all services pass the build stage, Docker images are created and pushed **only on the `master` branch`.**

A **matrix strategy** is used to build all services in parallel:

```yaml
matrix:
  include:
    - service: auth
      context: ./auth-api
      dockerfile: ./auth-api/Dockerfile
    - service: users
      context: ./users-api
      dockerfile: ./users-api/Dockerfile
    - service: tasks
      context: ./tasks-api
      dockerfile: ./tasks-api/Dockerfile
    - service: frontend
      context: ./frontend
      dockerfile: ./frontend/Dockerfile
```

### What the Matrix Does

- Selects the correct directory for each microservice  
- Applies the correct Dockerfile  
- Builds all images **in parallel**  
- Pushes them to Docker Hub:

```
aleksandromilenkov/kub-demo-<service>
```

Images get:

- A `latest` tag  
- A SHA-based tag for traceability  

---

## ☸️ 4️⃣ Deploy to Minikube (Develop branch only)

When pushing to the `develop` branch, the pipeline:

1. Boots a Minikube cluster  
2. Enables the Kubernetes Ingress addon  
3. Applies your Kubernetes manifests  
4. Waits for pods to become ready  
5. Performs smoke tests:
   - Ensures frontend is reachable  
   - Outputs cluster state  

This gives you a full Kubernetes environment inside GitHub Actions for automatic integration testing.

---

## 🧪 Summary of Pipeline

| Stage | Purpose | Trigger |
|-------|---------|---------|
| Frontend Build | Builds React + tests | master, develop, PR |
| Auth Build | Installs + tests | master, develop, PR |
| Users Build | Installs + tests | master, develop, PR |
| Tasks Build | Installs + tests | master, develop, PR |
| Docker Build & Push | Builds + pushes all images | master only |
| Deploy to Minikube | Full k8s test deployment | develop only |

---

## 🎉 Result

With this CI/CD pipeline:

- Frontend + backend always compile  
- Docker images are automatically published  
- Production images only come from the `master` branch  
- Kubernetes test deployments run automatically  
- Microservices build in parallel for faster pipelines  



## 📄 License

This project is for educational purposes.

## 👤 Author

Aleksandar Milenkov

## 🙏 Acknowledgments

This project demonstrates basic Kubernetes concepts including:
- Microservices architecture
- Service discovery
- Ingress routing
- ConfigMaps
- Container orchestration
- Inter-service communication
