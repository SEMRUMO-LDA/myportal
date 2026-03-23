# 📘 Guia Prático: Como Migrar Componentes para React Query

---

## 🎯 EXEMPLO 1: Componente Simples (Locations)

### **ANTES: LocationsManagement.tsx (Estado Manual)**

```typescript
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Location } from '../types';

function LocationsManagement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Manual fetch on mount
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const mappedLocations: Location[] = data.map((l: any) => ({
        id: l.id,
        name: l.name,
        address: l.address,
        coordinates: l.coordinates,
        radius: l.radius,
        isActive: l.is_active,
        createdAt: l.created_at
      }));

      setLocations(mappedLocations);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading locations...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Locations ({locations.length})</h1>
      {locations.map(loc => (
        <div key={loc.id}>{loc.name}</div>
      ))}
    </div>
  );
}
```

**Problemas:**
- ❌ 40+ linhas de boilerplate
- ❌ Manual state management
- ❌ Sem cache (re-fetch em cada mount)
- ❌ Sem background refresh
- ❌ Sem retry on error

---

### **DEPOIS: LocationsManagement.tsx (React Query)**

```typescript
import React from 'react';
import { useLocations } from '../hooks/queries';

function LocationsManagement() {
  const { data: locations = [], isLoading, error } = useLocations();

  if (isLoading) return <div>Loading locations...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Locations ({locations.length})</h1>
      {locations.map(loc => (
        <div key={loc.id}>{loc.name}</div>
      ))}
    </div>
  );
}
```

**Benefícios:**
- ✅ 15 linhas (60% menos código)
- ✅ Cache automático (5 minutos)
- ✅ Background refetch on focus
- ✅ Retry automático (2 tentativas)
- ✅ IndexedDB persistence
- ✅ Shared cache (múltiplos componentes)

---

## 🎯 EXEMPLO 2: Componente com Filtros (TimeLogs)

### **ANTES: AttendanceControl.tsx (Parte relevante)**

```typescript
const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
const [loading, setLoading] = useState(true);
const [dateFrom, setDateFrom] = useState('2026-03-01');

useEffect(() => {
  fetchTimeLogs();
}, [dateFrom]); // Re-fetch quando date muda

const fetchTimeLogs = async () => {
  setLoading(true);

  let query = supabase
    .from('time_logs')
    .select('*')
    .gte('date', dateFrom)
    .order('date', { ascending: false });

  // Filter by role
  const isAdmin = user?.role === 'ADMIN';
  if (!isAdmin) {
    query = query.eq('user_id', user?.id);
  }

  const { data, error } = await query;

  if (data) {
    setTimeLogs(data.map(/* mapping logic */));
  }

  setLoading(false);
};
```

---

### **DEPOIS: AttendanceControl.tsx (React Query)**

```typescript
import { useTimeLogs } from '../hooks/queries';

const [dateFrom, setDateFrom] = useState('2026-03-01');

// Hook automatically handles role-based filtering
const { data: timeLogs = [], isLoading } = useTimeLogs(dateFrom);

// Quando dateFrom muda, React Query busca automaticamente
// e mantém dados antigos visíveis durante fetch (stale-while-revalidate)
```

**Magia acontecendo:**
- ✅ Filtragem por role (admin vs employee) automática
- ✅ Quando `dateFrom` muda, React Query re-fetch automaticamente
- ✅ Durante re-fetch, dados antigos permanecem visíveis (UX suave)
- ✅ Cache separado por date (`['timeLogs', userId, dateFrom]`)
- ✅ Stale time de 30s (dados frequentes)

---

## 🎯 EXEMPLO 3: Mutation (Criar/Atualizar Dados)

### **Criar uma Location (POST)**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

function CreateLocationForm() {
  const queryClient = useQueryClient();

  // Define mutation
  const createLocation = useMutation({
    mutationFn: async (newLocation: Partial<Location>) => {
      const { data, error } = await supabase
        .from('locations')
        .insert([newLocation])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // CRITICAL: Invalidate cache after success
    onSuccess: () => {
      // Força re-fetch de locations
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    }
  });

  const handleSubmit = (formData: any) => {
    createLocation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... form fields ... */}
      <button
        type="submit"
        disabled={createLocation.isPending}
      >
        {createLocation.isPending ? 'Creating...' : 'Create Location'}
      </button>

      {createLocation.isError && (
        <div>Error: {createLocation.error.message}</div>
      )}

      {createLocation.isSuccess && (
        <div>Location created successfully!</div>
      )}
    </form>
  );
}
```

**O que acontece:**
1. User clica "Create Location"
2. `createLocation.mutate()` envia POST ao Supabase
3. Se sucesso, `queryClient.invalidateQueries(['locations'])` marca cache como stale
4. Todos os componentes usando `useLocations()` **automaticamente re-fetch** em background
5. UI atualiza sem refresh manual!

---

## 🎯 EXEMPLO 4: Optimistic Updates (UX Avançado)

### **Editar Location com UI Instantânea**

```typescript
const updateLocation = useMutation({
  mutationFn: async ({ id, updates }: { id: number; updates: Partial<Location> }) => {
    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // OPTIMISTIC UPDATE: Atualiza UI ANTES do server responder
  onMutate: async ({ id, updates }) => {
    // Cancela queries in-flight
    await queryClient.cancelQueries({ queryKey: ['locations'] });

    // Snapshot do estado atual (para rollback se falhar)
    const previousLocations = queryClient.getQueryData(['locations']);

    // Atualiza cache otimisticamente
    queryClient.setQueryData(['locations'], (old: Location[]) => {
      return old.map(loc =>
        loc.id === id ? { ...loc, ...updates } : loc
      );
    });

    // Retorna context para rollback
    return { previousLocations };
  },

  // Se falhar, rollback
  onError: (err, variables, context) => {
    queryClient.setQueryData(['locations'], context.previousLocations);
  },

  // Sempre re-fetch no final
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['locations'] });
  }
});

// Uso:
updateLocation.mutate({ id: 123, updates: { name: 'New Name' } });
// UI atualiza INSTANTANEAMENTE, depois confirma com server
```

**UX:**
- User clica "Save" → **UI atualiza imediatamente**
- Server processa em background
- Se sucesso: UI já está correta ✅
- Se erro: Rollback automático + mensagem de erro ❌

---

## 🎯 EXEMPLO 5: Dependent Queries (Queries Encadeadas)

### **Fetch User Details → Fetch User's TimeLogs**

```typescript
function UserDetails({ userId }: { userId: number }) {
  // Query 1: Fetch user
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Query 2: Fetch user's time logs (ONLY if user loaded)
  const { data: timeLogs = [] } = useQuery({
    queryKey: ['userTimeLogs', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user, // CRITICAL: Só executa se user existir
  });

  if (!user) return <div>Loading user...</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>Time logs: {timeLogs.length}</p>
    </div>
  );
}
```

**Comportamento:**
1. Query 1 (user) executa imediatamente
2. Query 2 (timeLogs) **aguarda** até Query 1 completar
3. Ambas queries têm cache independente
4. Se `userId` mudar, ambas re-fetch automaticamente

---

## 🎯 EXEMPLO 6: Infinite Scroll (Paginação)

### **Lista Infinita de Time Logs**

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function InfiniteTimeLogsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['timeLogsInfinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .order('date', { ascending: false })
        .range(pageParam * 50, (pageParam + 1) * 50 - 1);

      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, pages) => {
      // Se última página tem 50 items, há mais páginas
      return lastPage.length === 50 ? pages.length : undefined;
    },
    initialPageParam: 0,
  });

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.map(log => (
            <div key={log.id}>{log.date}</div>
          ))}
        </div>
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

**UX:**
- User scrolla até o fim → Clica "Load More"
- Páginas anteriores permanecem visíveis
- Cache preserva todas as páginas carregadas
- Refresh mantém posição de scroll

---

## 📊 COMPARAÇÃO DE PERFORMANCE

### **Cenário: User navega Dashboard → Locations → Dashboard**

#### **SEM React Query:**
1. Dashboard mount → 79 queries (3s)
2. User navega para Locations → 5 queries (1s)
3. User volta para Dashboard → **79 queries novamente** (3s)

**Total:** 163 queries, 7s waiting

#### **COM React Query:**
1. Dashboard mount → 79 queries (3s) ← primeira vez
2. User navega para Locations → **0 queries** (cache hit, <100ms)
3. User volta para Dashboard → **0 queries** (cache hit, <100ms)
4. Background: 5-10 queries refresh stale data

**Total:** 85 queries, 3.2s waiting (**-78 queries, -54% tempo**)

---

## 🛠️ DEBUGGING E DEVTOOLS

### **Instalar React Query DevTools (Desenvolvimento)**

```typescript
// App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

return (
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
```

**Benefícios:**
- 🔍 Ver todas as queries ativas
- 📊 Ver cache state (fresh, stale, fetching)
- 🔄 Trigger manual refetch
- 🗑️ Clear cache específico
- ⏱️ Ver tempo de fetch
- 📈 Query timeline

---

## 🎓 REGRAS DE OURO

### **1. QueryKey deve ser único e descritivo**
```typescript
// ❌ BAD
useQuery({ queryKey: ['data'] })

// ✅ GOOD
useQuery({ queryKey: ['timeLogs', userId, dateFrom] })
```

### **2. Sempre definir staleTime apropriado**
```typescript
// Dados estáticos (raramente mudam)
useQuery({ staleTime: 1000 * 60 * 60 }) // 1 hora

// Dados dinâmicos (mudam frequentemente)
useQuery({ staleTime: 1000 * 30 }) // 30 segundos
```

### **3. Usar enabled para queries condicionais**
```typescript
// ❌ BAD
if (userId) {
  useQuery(...)
}

// ✅ GOOD
useQuery({
  enabled: !!userId
})
```

### **4. Invalidar cache após mutations**
```typescript
useMutation({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['locations'] });
  }
})
```

### **5. Usar select para transformações**
```typescript
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  select: (users) => users.filter(u => u.status === 'ACTIVE')
  // Só re-render se active users mudarem
})
```

---

## 🚀 CHECKLIST DE MIGRAÇÃO

Para cada componente que quer migrar:

- [ ] 1. Identificar qual hook usar (useUsers, useTimeLogs, etc)
- [ ] 2. Se hook não existe, criar em `hooks/queries/`
- [ ] 3. Remover useState para esse data
- [ ] 4. Remover useEffect de fetch
- [ ] 5. Adicionar import do hook
- [ ] 6. Usar `const { data, isLoading, error } = useHook()`
- [ ] 7. Testar em dev
- [ ] 8. Verificar cache no DevTools
- [ ] 9. Deploy staging
- [ ] 10. QA + testes de performance

---

## 📞 TROUBLESHOOTING COMUM

### **Problema: "Query não atualiza após mutation"**
**Solução:** Invalidate cache
```typescript
queryClient.invalidateQueries({ queryKey: ['locations'] });
```

### **Problema: "Muitas re-renders"**
**Solução:** Aumentar staleTime
```typescript
useQuery({ staleTime: 1000 * 60 * 5 })
```

### **Problema: "Cache não persiste"**
**Solução:** Verificar IndexedDB no DevTools → Application

### **Problema: "Query executa quando não deveria"**
**Solução:** Usar enabled
```typescript
useQuery({ enabled: false })
```

---

**Criado por:** Claude Code
**Data:** 22 de Março de 2026

---

# 🎯 PRONTO PARA MIGRAR COMPONENTES!
