# PIN Change Logic - Fixes Applied

## Date: 2026-03-19

## Issues Fixed

### 1. **Inconsistent State Management**
**Problem**: After PIN change, the user state was not properly synchronized between:
- Supabase Auth session
- Database record
- Local React state

**Solution**: Implemented a sequential update process:
1. Update Supabase Auth password (if session exists)
2. Update database record (`pin` + `requires_new_pin` fields)
3. Update local state via `onUpdateUser()`
4. Sign out to force fresh authentication
5. Reset form with success message

### 2. **Race Conditions**
**Problem**: Multiple state updates happening simultaneously could cause:
- Form not resetting properly
- User getting stuck in PIN change flow
- Navigation happening before PIN change completes

**Solution**:
- Added `isValidating` flag to prevent duplicate submissions
- Used sequential `await` for each update step
- Added proper error handling at each stage
- Clear timeout-based success message (2s delay)

### 3. **Missing Validation**
**Problem**: No validation that new PIN is different from old PIN

**Solution**:
- Hash the new PIN first
- Compare with existing hashed PIN
- Show error if they match
- Reset to `new-pin` step for retry

### 4. **Improved Error Messages**
**Problem**: Generic error messages didn't help users understand what went wrong

**Solution**:
- Specific error for "PIN must be different"
- Specific error for database failures
- Specific error for auth failures
- Clear success message with emoji
- Context-aware messages for default PINs (123456, 1111, 1234, 0000)

### 5. **Navigation Logic**
**Problem**: useEffect could redirect user even when PIN change was required

**Solution**:
- Improved `requiresNewPin` check in useEffect
- Ensure mode is set to 'employee' for PIN change
- Pre-fill accessCode to maintain user context
- Set appropriate error messages for both login types
- Prevent navigation until PIN change completes

### 6. **Better UX Flow**
**Problem**: User experience during PIN change was confusing

**Solution**:
- Show clear message when default PIN detected
- Display success message for 2 seconds before reset
- Clear all PIN fields after error
- Reset to appropriate step based on error type
- Disable keypad during validation

## Code Changes

### File: `pages/Login.tsx`

#### Change 1: useEffect Navigation Logic (Lines 33-63)
```typescript
// Better handling of requiresNewPin flag
if (user.requiresNewPin) {
  // Ensure we're in employee mode
  if (mode !== 'employee') {
    setMode('employee');
  }

  // Pre-fill ID and move to PIN change
  setAccessCode(user.id.toString());
  setStep('new-pin');
  setNewPin('');
  setConfirmPin('');

  // Show clear message
  setEmployeeError('É necessário alterar o seu PIN no primeiro acesso.');
  return;
}
```

#### Change 2: handleSuccessfulLogin (Lines 381-409)
```typescript
const handleSuccessfulLogin = (user: any, pinEntered: string) => {
  // Expanded default PIN detection
  const isDefaultPin = pinEntered === '123456' ||
                       pinEntered === '1111' ||
                       pinEntered === '1234' ||
                       pinEntered === '0000';

  if (user.requiresNewPin || isDefaultPin) {
    // Clear states and show contextual message
    setIsValidating(false);
    setStep('new-pin');
    setNewPin('');
    setConfirmPin('');

    if (isDefaultPin) {
      setEmployeeError('⚠️ PIN padrão detetado. Por favor, altere para um PIN personalizado.');
    } else {
      setEmployeeError('É necessário alterar o seu PIN antes de continuar.');
    }
  } else {
    // Normal login flow
    setIsValidating(false);
    if (isKioskMode) {
      performEmployeeLogin(user);
    }
  }
};
```

#### Change 3: PIN Update Logic (Lines 519-648)
```typescript
// Sequential update process with proper error handling
try {
  setIsValidating(true);

  // 1. Update Supabase Auth (if session exists)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { error: authError } = await supabase.auth.updateUser({
      password: newPin
    });
    if (authError) {
      // Handle auth-specific errors
      setEmployeeError('Erro na autenticação: ' + authError.message);
      return;
    }
  }

  // 2. Update database
  const { error: dbError } = await supabase
    .from('users')
    .update({
      pin: hashedNewPin,
      requires_new_pin: false
    })
    .eq('id', user.id);

  if (dbError) {
    setEmployeeError('Erro ao atualizar PIN na base de dados: ' + dbError.message);
    return;
  }

  // 3. Update local state
  onUpdateUser({
    ...user,
    pin: hashedNewPin,
    requiresNewPin: false
  }, true);

  // 4. Sign out to force fresh login
  if (session?.user) {
    await supabase.auth.signOut();
  }

  // 5. Show success and reset
  setEmployeeError('✅ PIN alterado com sucesso! Faça login com o novo PIN.');

  setTimeout(() => {
    setConfirmPin('');
    setNewPin('');
    setPin('');
    setAccessCode('');
    setStep('id');
    setEmployeeError('');
  }, 2000);

} catch (err: any) {
  setEmployeeError('Erro inesperado: ' + (err?.message || 'Tente novamente'));
  setIsValidating(false);
}
```

## Testing Recommendations

1. **Test Default PIN Detection**
   - Login with PIN 123456
   - Verify forced PIN change
   - Try to set same PIN (should fail)
   - Set different PIN (should succeed)

2. **Test requiresNewPin Flag**
   - Set `requires_new_pin = true` in database
   - Login with user
   - Verify forced PIN change flow
   - Complete PIN change
   - Verify flag is cleared in database

3. **Test Error Scenarios**
   - Network failure during update
   - Database update failure
   - Auth update failure
   - User not found error

4. **Test UX Flow**
   - Verify success message shows for 2s
   - Verify form resets to ID step
   - Verify user can login with new PIN
   - Verify keypad disabled during validation

## Database Schema Verification

Ensure these columns exist in `users` table:
- `pin` (text) - stores hashed PIN
- `requires_new_pin` (boolean) - flag for mandatory PIN change

## Next Steps

1. Monitor production logs for PIN change attempts
2. Gather user feedback on the new flow
3. Consider adding PIN strength validation (optional)
4. Consider adding PIN history to prevent reuse (optional)

## Security Notes

- All PINs are hashed using SHA-256 before storage
- Never store plain-text PINs
- Session is cleared after PIN change to force re-authentication
- Both Auth and Database are updated for redundancy
