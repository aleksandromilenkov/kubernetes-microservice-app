# 🧭 Kubernetes Ingress Architecture — Application Overview

This document explains how the microservices application is deployed and how
traffic flows through Kubernetes using **NGINX Ingress**.

---

## ⚙️ High-Level Architecture

```
Browser (http://myapp.local)
│
▼
+--------------------+
| NGINX Ingress      |
| (Path Rewriting)   |
+--------------------+
│ │ │ │
▼ ▼ ▼ ▼
auth-service user-service tasks-service frontend-service
│ │ │ │
▼ ▼ ▼ ▼
auth-deployment user-deployment tasks-deployment frontend-deployment
```

---

## 🧱 Components

### 1. Deployments

Each microservice (Auth, Users, Tasks, Frontend) runs as a **Deployment**.
A Deployment ensures the correct number of **Pods** are always running.

Example — `tasks-deployment`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tasks-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tasks
  template:
    metadata:
      labels:
        app: tasks
    spec:
      containers:
        - name: tasks
          image: aleksandromilenkov/kub-demo-tasks:latest
          ports:
            - containerPort: 8000
          env:
            - name: AUTH_SERVICE
              value: auth-service
            - name: TASKS_FOLDER
              value: tasks
```

✅ **What it does:**
- Runs one container (kub-demo-tasks) in a Pod
- Automatically restarts it if it crashes
- Sets environment variables for service discovery

---

### 2. Services

Each Deployment is exposed internally through a **Service**.

Example — `tasks-service`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: tasks-service
spec:
  selector:
    app: tasks
  type: NodePort
  ports:
    - protocol: TCP
      port: 8000
      targetPort: 8000
```

✅ **Purpose:**
- Provides a stable DNS name inside the cluster (`tasks-service`)
- Automatically load balances across Pods with label `app: tasks`
- NodePort allows external access for debugging (but production uses Ingress)

🧠 **Inside the cluster**, any Pod can call:
```
http://tasks-service:8000/tasks
```

---

### 3. Ingress (⚠️ Critical Concept)

The Ingress routes external HTTP requests from outside the cluster to the
correct internal services **with path rewriting**.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
  - host: myapp.local
    http:
      paths:
      - path: /auth(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: auth-service
            port:
              number: 80
      - path: /users(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: user-service
            port:
              number: 8080
      - path: /tasks(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: tasks-service
            port:
              number: 8000
      - path: /()(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

✅ **Purpose:**
- Central entry point to the cluster (`myapp.local`)
- NGINX routes requests based on path regex patterns
- **Rewrites paths** using capture groups

#### 🔍 How Path Rewriting Works

The annotation `nginx.ingress.kubernetes.io/rewrite-target: /$2` uses the **second capture group** from the path regex.

**Example with `/tasks/tasks` request:**

1. **Pattern:** `/tasks(/|$)(.*)`
   - First part: `/tasks` (literal match)
   - Capture group 1: `(/|$)` matches `/`
   - Capture group 2: `(.*)` matches `tasks`

2. **Rewrite:** `/$2` becomes `/tasks`

3. **Result:** Backend receives `/tasks` instead of `/tasks/tasks`

**Request Flow:**
```
Browser: GET http://myapp.local/tasks/tasks
         ↓
Ingress: Matches /tasks(/|$)(.*)
         Captures: group1="/", group2="tasks"
         ↓
Rewrite: /$2 = /tasks
         ↓
Backend: Receives GET /tasks
```

⚠️ **This is why the frontend must call `/tasks/tasks` instead of just `/tasks`!**

If frontend called `/tasks`, the rewrite would produce `/` (empty capture group), which doesn't exist on the backend.

---

### 4. Frontend (React)

The React frontend calls API endpoints accounting for the ingress rewrite:

```javascript
const TASKS_URL = "/tasks";

// Fetches from /tasks/tasks (external path)
// Backend receives /tasks (after rewrite)
fetch(`${TASKS_URL}/tasks`, { 
  headers: { Authorization: "Bearer abc" } 
});
```

✅ **How it flows:**
1. Browser sends request to `http://myapp.local/tasks/tasks`
2. Ingress matches `/tasks(/|$)(.*)` pattern
3. Ingress rewrites to `/tasks` using `/$2`
4. `tasks-service:8000` receives request at `/tasks` endpoint
5. Backend returns JSON → displayed in the frontend

---

### 5. Backend-to-Backend Communication

Services communicate **internally** using Kubernetes DNS, bypassing the Ingress.

Example from Tasks API (`tasks-app.js`):

```javascript
const extractAndVerifyToken = async (headers) => {
  const token = headers.authorization.split(' ')[1];
  
  // Uses internal service name from environment variable
  // process.env.AUTH_SERVICE = "auth-service"
  const response = await axios.get(
    `http://${process.env.AUTH_SERVICE}/verify-token/${token}`
  );
  return response.data.uid;
};
```

Environment variable in Deployment:

```yaml
env:
  - name: AUTH_SERVICE
    value: auth-service  # Just the service name, not full URL
```

✅ **Effect:**
- Services communicate using internal DNS names (e.g., `http://auth-service`)
- These requests **do not go through Ingress** — they stay inside the cluster network
- Faster and more efficient than routing through external ingress
- Default port 80 is used if not specified

🧠 **Kubernetes DNS Resolution:**
- `auth-service` → resolves to ClusterIP of auth-service
- `user-service:8080` → resolves to ClusterIP with specific port
- Services in same namespace can use short names

---

### 6. ConfigMap

Centralized configuration shared by multiple Pods:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  AUTH_SERVICE: "http://myapp.local/auth"
  USER_SERVICE: "http://myapp.local/users"
  TASKS_SERVICE: "http://myapp.local/tasks"
```

⚠️ **Important Note:** 
The ConfigMap in this project contains **external URLs** which are primarily for documentation. Backend services use **direct environment variables** with internal service names instead:

```yaml
env:
  - name: AUTH_SERVICE
    value: auth-service  # Internal DNS name
```

✅ **Best Practice for ConfigMaps:**
For backend-to-backend communication, use internal service URLs:
```yaml
data:
  AUTH_SERVICE_URL: "http://auth-service"
  USER_SERVICE_URL: "http://user-service:8080"
  TASKS_SERVICE_URL: "http://tasks-service:8000"
```

---

### 7. Minikube & Host Mapping

Minikube runs Kubernetes locally inside a VM or container.

To make `myapp.local` accessible from your browser, you added this line to:

**Windows:** `C:\Windows\System32\drivers\etc\hosts`  
**Linux/Mac:** `/etc/hosts`

```
172.23.80.115 myapp.local
```

✅ **Effect:**
- Maps `myapp.local` → Minikube IP (get with `minikube ip`)
- Traffic goes from your browser → Minikube Ingress Controller → Services
- Without this mapping, browser can't resolve `myapp.local`

---

## 🔍 Complete Request Flow Example

### Example: Fetching Tasks

1. User opens `http://myapp.local` in browser
2. **Frontend served** by `frontend-service`
3. React app calls `fetch("/tasks/tasks")`
4. Browser sends: `GET http://myapp.local/tasks/tasks`
5. **NGINX Ingress** receives request:
   - Matches pattern `/tasks(/|$)(.*)`
   - Captures: group1="/", group2="tasks"
   - Rewrites to `/tasks` using `/$2`
6. Routes to `tasks-service:8000/tasks`
7. **Tasks API** receives `GET /tasks`:
   - Extracts Bearer token from headers
   - Calls `http://auth-service/verify-token/abc` (internal)
8. **Auth service** verifies token:
   - Returns `{ uid: "user123" }`
9. **Tasks API** reads from `tasks.txt` file
10. Returns JSON: `{ tasks: [...] }`
11. **Frontend** receives data and displays tasks

### Visual Flow:

```
Browser              Ingress           Tasks Service      Auth Service
   │                    │                    │                 │
   │─GET /tasks/tasks──>│                    │                 │
   │                    │─GET /tasks────────>│                 │
   │                    │                    │─verify token───>│
   │                    │                    │<──{uid}─────────│
   │                    │<──{tasks:[...]}────│                 │
   │<───{tasks:[...]}───│                    │                 │
```

---

## 🧩 Kubernetes Concepts Summary

| Component | Description |
|-----------|-------------|
| **Deployment** | Ensures a desired number of Pod replicas are running |
| **Pod** | A single instance of a running container |
| **Service** | Stable internal endpoint for a set of Pods; provides load balancing |
| **Ingress** | Routes external HTTP/S traffic to internal Services with path rewriting |
| **Ingress Controller (NGINX)** | The actual reverse proxy processing the routing rules |
| **ConfigMap** | Externalized configuration for environment variables and URLs |
| **Minikube** | Local Kubernetes cluster for testing and development |

---

## ✅ Summary

- **Ingress** handles routing between external URLs and backend Services with **path rewriting**
- The `/$2` rewrite pattern strips the first path segment (service prefix)
- Frontend uses `/tasks/tasks` which becomes `/tasks` at the backend
- **Services** provide stable DNS and load balancing inside the cluster
- **Deployments** keep your containers running and self-healing
- Backend services use **internal DNS names** for fast, direct communication
- The `/etc/hosts` mapping connects your local browser to Minikube's IP
- **ConfigMaps** can store configuration, but direct env vars work for simple service discovery

---

## 🧾 Useful Commands

| Command | Purpose |
|---------|---------|
| `minikube ip` | Get the IP address of the Minikube VM |
| `kubectl get all` | List all Pods, Services, Deployments |
| `kubectl get ingress` | Show ingress host, address, and rules |
| `kubectl describe ingress app-ingress` | Debug ingress configuration and view rewrite rules |
| `kubectl logs -n ingress-nginx deploy/ingress-nginx-controller` | View ingress controller logs |
| `kubectl rollout restart deployment <name>` | Restart a Deployment after code changes |
| `kubectl logs <pod-name>` | View application logs |
| `kubectl exec -it <pod-name> -- /bin/sh` | Access pod shell for debugging |
| `kubectl get configmap app-config -o yaml` | View ConfigMap contents |

---

## 🧠 Key Takeaways

1. **Ingress simplifies access** to multiple microservices using one domain with path-based routing
2. **Path rewriting** is critical — `/tasks/tasks` becomes `/tasks` for the backend
3. **Internal communication** happens through Services using DNS, not Ingress
4. **Service discovery** uses simple DNS names like `auth-service` instead of full URLs
5. **ConfigMaps** can centralize configuration but aren't required for basic service discovery
6. `myapp.local` is a **local DNS alias** to your Minikube IP for browser access
7. This setup closely mirrors **how production Kubernetes environments** handle microservices routing

---

## 📚 Further Learning

- Understanding ingress rewrite rules and regex patterns
- Kubernetes networking and DNS resolution
- Service mesh (Istio, Linkerd) for advanced traffic management
- Persistent volumes for stateful applications
- Horizontal Pod Autoscaling (HPA)
- Production ingress with TLS/SSL certificates

---

**End of Document**