# ⚡ Quick Deploy Instructions

## 🎯 Gotowe do wdrożenia w 5 minut!

### 1. Znajdź Service Role Key
W Supabase `printpilot-prod` → **Project Settings** → **API**:
- Znajdź klucz oznaczony jako **"service_role"** lub **"secret"**  
- Skopiuj go i wklej poniżej ⬇️

**Service Role Key:** ✅ `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (GOTOWE!)

---

### 2. GitHub Setup (2 minuty)
```bash
# W terminalu w folderze printpilot-app:

# Utwórz repo na GitHub.com, potem:
git remote add origin https://github.com/USERNAME/printpilot-app.git
git push -u origin main
```

---

### 3. Vercel Deployment (3 minuty)

#### **A) Import Project**
1. Idź na https://vercel.com/new
2. **Import** → wybierz swoje GitHub repo
3. **Framework**: Next.js ✅ (auto-detect)

#### **B) Environment Variables**
Dodaj te zmienne w Vercel:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres.aqwfrseizmtrvyijftja:TqMBSINVQ9HBdrYD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
NEXTAUTH_SECRET=JazP+V6Tkga/19+mt8pMo0y3rOdInB6mC3OBzru4K/4=
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://aqwfrseizmtrvyijftja.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxd2Zyc2Vpem10cnZ5aWpmdGphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NTQzNTQsImV4cCI6MjA2NTIzMDM1NH0.VSS5JPj2hnR6KtBqwcMvJ0wB2xnXWEVCt_My0FJTbQY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxd2Zyc2Vpem10cnZ5aWpmdGphIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY1NDM1NCwiZXhwIjoyMDY1MjMwMzU0fQ.KKahePk8XzB5SqTLYIMNnPn6wMycXuUv4zytv4YXO7c
```

#### **C) Deploy!**
Kliknij **Deploy** → czekaj 2-3 minuty ⏱️

---

### 4. Production Database Setup
Po udanym deploymencie, ustaw production dane:

```bash
# W .env.local zmień na prod:
DATABASE_URL="postgresql://postgres.aqwfrseizmtrvyijftja:TqMBSINVQ9HBdrYD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Uruchom migration:
npx prisma db push
node scripts/migrate-essential-data.js
```

---

## 🎊 **Gotowe!**

**Aplikacja będzie dostępna na:** `https://your-app-name.vercel.app`

**Login:** admin@printpilot.com / admin123!@#

---

**Potrzebujesz tylko Service Role Key i można startować! 🚀**