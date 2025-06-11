# 🚀 PrintPilot Deployment Guide

## ✅ Status: Gotowe do wdrożenia!

### Co zostało zrobione:
- ✅ Git repository zainicjalizowany 
- ✅ Initial commit utworzony (156 plików)
- ✅ .env.example template przygotowany
- ✅ .gitignore skonfigurowany (chroni sekrety)
- ✅ PostgreSQL/Supabase migration zakończona

---

## 🌐 Deploy na Vercel

### 1. Utwórz GitHub Repository
```bash
# W terminalu:
cd printpilot-app
git remote add origin https://github.com/USERNAME/printpilot-app.git
git branch -M main  
git push -u origin main
```

### 2. Połącz z Vercel
1. Idź na https://vercel.com
2. **Import Project** → wybierz swoje repo
3. **Framework**: Next.js (auto-detect)
4. **Build Command**: `npm run build`
5. **Output Directory**: `.next` (auto)

### 3. Skonfiguruj Environment Variables
W Vercel dashboard dodaj wszystkie zmienne z `.env.production`:

```
NODE_ENV=production
DATABASE_URL=postgresql://postgres.[PROD_PROJECT_ID]:TqMBSINVQ9HBdrYD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
NEXTAUTH_SECRET=[WYGENERUJ_NOWY]
NEXTAUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://[PROD_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[PROD_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[PROD_SERVICE_KEY]
```

### 4. Uruchom Production Migration
```bash
# Po deploymencie na Vercel:
npx prisma db push --schema=./prisma/schema.prisma
node scripts/migrate-essential-data.js
```

---

## 📝 Następne kroki po deploymencie:

### **Production Setup Checklist:**
- [ ] Wklej dane z printpilot-prod do PRODUCTION_SETUP.md
- [ ] Zaktualizuj .env.production z prawdziwymi kluczami
- [ ] Uruchom production migration
- [ ] Przetestuj aplikację na domenie Vercel
- [ ] Skonfiguruj custom domain (opcjonalnie)

### **Security Checklist:**
- [ ] Sprawdź czy .env.local NIE jest w repo
- [ ] Sprawdź czy wszystkie API keys są w Vercel env
- [ ] Włącz Supabase Row Level Security (RLS)
- [ ] Skonfiguruj CORS dla production domain

### **Monitoring:**
- [ ] Dodaj Vercel Analytics
- [ ] Skonfiguruj error tracking (Sentry)
- [ ] Ustawić alerty dla Supabase usage

---

## 🔄 Development Workflow

### Local Development:
```bash
npm run dev          # Start dev server
npx prisma studio    # Database GUI
npm run build        # Test production build
```

### Production Updates:
```bash
git add .
git commit -m "feature: opis zmian"
git push origin main  # Auto-deploy na Vercel
```

---

## 🎯 URLs po deploymencie:

### **Development:**
- **App**: http://localhost:3001
- **Database**: Supabase printpilot-dev

### **Production:**
- **App**: https://printpilot-app.vercel.app (lub custom domain)
- **Database**: Supabase printpilot-prod

---

**🎊 PrintPilot jest gotowy do wdrożenia na Vercel!**

Potrzebujesz tylko:
1. Dane z printpilot-prod Supabase
2. GitHub repo
3. 5 minut na Vercel setup