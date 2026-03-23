# 🎯 Como Integrar o Loading Otimizado no KioskDashboard

## Implementação no KioskDashboard.tsx

### 1. Importar o componente:

```typescript
import KioskLoadingOptimized from '../components/KioskLoadingOptimized';
```

### 2. Adicionar estado de loading:

```typescript
const [isFullyLoaded, setIsFullyLoaded] = useState(false);
```

### 3. Modificar o useEffect para usar o loading:

```typescript
const KioskDashboard = ({ user, ... }) => {
    const [isFullyLoaded, setIsFullyLoaded] = useState(false);
    const [dataLoaders, setDataLoaders] = useState(null);

    useEffect(() => {
        // Preparar as funções de loading
        setDataLoaders({
            checkSession: async () => {
                try {
                    const result = await checkAndCloseOpenSessions(user.id);
                    setHasUnclosedSession(result.hasOpenSessions);
                    return result;
                } catch (error) {
                    console.error('Session check failed:', error);
                    return null;
                }
            },
            loadAnomalies: async () => {
                try {
                    const { data } = await supabase
                        .from('anomalies')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('status', 'AWAITING_JUSTIFICATION');

                    if (data) setPendingAnomalies(data);
                    return data;
                } catch (error) {
                    console.error('Anomalies load failed:', error);
                    return null;
                }
            },
            loadVehicles: async () => {
                try {
                    const trip = await fetchActiveTrip(user.id);
                    if (trip) setActiveTrip(trip);
                    return trip;
                } catch (error) {
                    console.error('Vehicles load failed:', error);
                    return null;
                }
            },
            loadUserData: async () => {
                // Qualquer outro dado do usuário
                return true;
            }
        });
    }, [user.id]);

    // Renderizar loading até estar tudo pronto
    if (!isFullyLoaded) {
        return (
            <KioskLoadingOptimized
                onLoadingComplete={() => setIsFullyLoaded(true)}
                loadingSteps={dataLoaders}
                userName={user.name}
                userPhoto={user.photoUrl}
            />
        );
    }

    // Resto do componente original...
    return (
        <div className="kiosk-dashboard">
            {/* Conteúdo do dashboard */}
        </div>
    );
};
```

## Versão Simplificada (sem callbacks):

```typescript
const KioskDashboard = ({ user, ... }) => {
    const [isFullyLoaded, setIsFullyLoaded] = useState(false);

    useEffect(() => {
        // Simular loading de 2-3 segundos
        const loadData = async () => {
            // Todas as suas chamadas de dados aqui
            await Promise.all([
                checkAndCloseOpenSessions(user.id).catch(e => console.warn(e)),
                fetchActiveTrip(user.id).catch(e => console.warn(e)),
                // outras chamadas...
            ]);

            // Marcar como carregado
            setIsFullyLoaded(true);
        };

        loadData();
    }, [user.id]);

    if (!isFullyLoaded) {
        return (
            <KioskLoadingOptimized
                onLoadingComplete={() => setIsFullyLoaded(true)}
                userName={user.name}
                userPhoto={user.photoUrl}
            />
        );
    }

    return (
        // Seu dashboard normal
    );
};
```

## Versão com Timeout de Segurança:

```typescript
useEffect(() => {
    let timeoutId;

    const loadData = async () => {
        // Timeout de segurança - máximo 5 segundos
        timeoutId = setTimeout(() => {
            console.warn('Loading timeout - forcing complete');
            setIsFullyLoaded(true);
        }, 5000);

        try {
            // Suas chamadas de dados
            await Promise.all([...]);

            clearTimeout(timeoutId);
            setIsFullyLoaded(true);
        } catch (error) {
            console.error('Loading error:', error);
            clearTimeout(timeoutId);
            setIsFullyLoaded(true); // Continuar mesmo com erro
        }
    };

    loadData();

    return () => clearTimeout(timeoutId);
}, [user.id]);
```

## Benefícios desta Abordagem:

### ✅ **UX Melhorada**
- Loading profissional com feedback visual
- Mostra progresso real ao utilizador
- Evita que o colaborador pense que travou

### ✅ **Gestão de Erros**
- Continua mesmo se algumas chamadas falharem
- Timeout de segurança evita loading infinito
- CORS errors não bloqueiam a interface

### ✅ **Performance**
- Carrega dados em paralelo
- Timeout em chamadas lentas
- Interface aparece assim que dados essenciais estão prontos

## Personalização:

### Mudar os passos do loading:

```typescript
const [steps] = useState([
    { id: 'custom1', label: 'A verificar frota', icon: <Car />, status: 'pending' },
    { id: 'custom2', label: 'A carregar férias', icon: <Calendar />, status: 'pending' },
    // etc...
]);
```

### Ajustar tempos:

```typescript
// Tempo mínimo de loading (evita flash)
const MIN_LOADING_TIME = 1500; // 1.5 segundos

// Timeout máximo
const MAX_LOADING_TIME = 5000; // 5 segundos
```

## Teste Rápido:

Para testar sem modificar muito código:

```typescript
// No início do KioskDashboard
const [showLoading, setShowLoading] = useState(true);

// Simular loading de 3 segundos
useEffect(() => {
    setTimeout(() => setShowLoading(false), 3000);
}, []);

if (showLoading) {
    return (
        <KioskLoadingOptimized
            onLoadingComplete={() => setShowLoading(false)}
            userName={user.name}
            userPhoto={user.photoUrl}
        />
    );
}
```

## Resultado Final:

1. **Colaborador faz login** → Vê loading bonito
2. **Dados carregam em paralelo** → Barra de progresso real
3. **Se houver erro CORS** → Continua após timeout
4. **Dashboard aparece** → Totalmente carregado

Isto resolve o problema de o colaborador não esperar!