// contracts/split-escrow/src/admin.rs
//
// ─────────────────────────────────────────────────────────────────────────────
// Issue #177 — Add Contract Admin Role and Ownership Transfer
//
// This is a NEW file. After creating it you also need to:
//   1. Add `mod admin;` near the top of lib.rs
//   2. Add `use crate::admin::AdminExt;` in lib.rs where you call admin helpers
//   3. Make sure DataKey::Admin and DataKey::PendingAdmin exist in your
//      DataKey enum in lib.rs (shown below).
// ─────────────────────────────────────────────────────────────────────────────
//
// In lib.rs — add these two variants to your DataKey enum:
//
//   #[contracttype]
//   pub enum DataKey {
//       Escrow(u64),
//       Admin,          // ← current admin address
//       PendingAdmin,   // ← nominee waiting to accept
//   }
// ─────────────────────────────────────────────────────────────────────────────

use soroban_sdk::{contracttype, symbol_short, Address, Env};

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    PendingAdmin,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Debug, PartialEq)]
pub enum AdminError {
    /// Caller is not the current admin.
    Unauthorized = 30,
    /// No pending admin nomination exists.
    NoPendingAdmin = 31,
    /// Caller is not the nominated pending admin.
    NotPendingAdmin = 32,
    /// Admin has not been initialised yet.
    AdminNotSet = 33,
}

// ── Event emitters ────────────────────────────────────────────────────────────

pub fn emit_admin_transferred(env: &Env, old_admin: Address, new_admin: Address) {
    let topics = (symbol_short!("adm_xfer"),);
    let data = (old_admin, new_admin, env.ledger().timestamp());
    env.events().publish(topics, data);
}

// ── Core helpers (call these from your #[contractimpl] block in lib.rs) ───────

/// Write the admin address during `initialize`.
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

/// Read the current admin; panics if not yet initialised.
pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("admin not set")
}

/// Require that `caller` is the current admin.
pub fn require_admin(env: &Env) -> Result<Address, AdminError> {
    let admin: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(AdminError::AdminNotSet)?;
    admin.require_auth();
    Ok(admin)
}

// ── 2-step transfer ───────────────────────────────────────────────────────────

/// Step 1 — current admin nominates a successor.
///
/// Stores the nominee in temporary storage (expires naturally if unused).
pub fn propose_new_admin(env: &Env, new_admin: Address) -> Result<(), AdminError> {
    let admin = require_admin(env)?;
    // Ignore the admin value itself — require_auth was the important part
    let _ = admin;

    env.storage()
        .temporary()
        .set(&DataKey::PendingAdmin, &new_admin);
    Ok(())
}

/// Step 2 — nominated successor calls this to confirm and complete the transfer.
pub fn accept_admin(env: &Env) -> Result<(), AdminError> {
    let pending: Address = env
        .storage()
        .temporary()
        .get(&DataKey::PendingAdmin)
        .ok_or(AdminError::NoPendingAdmin)?;

    // The pending admin must authorise this call
    pending.require_auth();

    let old_admin = get_admin(env);

    // Promote pending → admin
    env.storage().instance().set(&DataKey::Admin, &pending);

    // Remove the pending nomination
    env.storage().temporary().remove(&DataKey::PendingAdmin);

    emit_admin_transferred(env, old_admin, pending);

    Ok(())
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Events, Address, Env};

    fn make_env() -> Env {
        let env = Env::default();
        env.mock_all_auths();
        env
    }

    #[test]
    fn test_set_and_get_admin() {
        let env = make_env();
        let admin = Address::generate(&env);
        set_admin(&env, &admin);
        assert_eq!(get_admin(&env), admin);
    }

    #[test]
    fn test_require_admin_passes_for_admin() {
        let env = make_env();
        let admin = Address::generate(&env);
        set_admin(&env, &admin);
        let result = require_admin(&env);
        assert!(result.is_ok());
    }

    #[test]
    fn test_propose_new_admin_stores_pending() {
        let env = make_env();
        let admin = Address::generate(&env);
        let successor = Address::generate(&env);
        set_admin(&env, &admin);
        propose_new_admin(&env, successor.clone()).unwrap();

        let stored: Address = env
            .storage()
            .temporary()
            .get(&DataKey::PendingAdmin)
            .unwrap();
        assert_eq!(stored, successor);
    }

    #[test]
    fn test_accept_admin_completes_transfer() {
        let env = make_env();
        let admin = Address::generate(&env);
        let successor = Address::generate(&env);
        set_admin(&env, &admin);
        propose_new_admin(&env, successor.clone()).unwrap();
        accept_admin(&env).unwrap();

        assert_eq!(get_admin(&env), successor);
    }

    #[test]
    fn test_accept_admin_clears_pending() {
        let env = make_env();
        let admin = Address::generate(&env);
        let successor = Address::generate(&env);
        set_admin(&env, &admin);
        propose_new_admin(&env, successor.clone()).unwrap();
        accept_admin(&env).unwrap();

        let pending: Option<Address> = env.storage().temporary().get(&DataKey::PendingAdmin);
        assert!(pending.is_none());
    }

    #[test]
    fn test_accept_admin_emits_event() {
        let env = make_env();
        let admin = Address::generate(&env);
        let successor = Address::generate(&env);
        set_admin(&env, &admin);
        propose_new_admin(&env, successor.clone()).unwrap();
        accept_admin(&env).unwrap();

        assert_eq!(env.events().all().len(), 1);
    }

    #[test]
    fn test_accept_admin_without_proposal_fails() {
        let env = make_env();
        let admin = Address::generate(&env);
        set_admin(&env, &admin);
        let result = accept_admin(&env);
        assert_eq!(result, Err(AdminError::NoPendingAdmin));
    }

    #[test]
    fn test_require_admin_without_set_fails() {
        let env = make_env();
        let result = require_admin(&env);
        assert_eq!(result, Err(AdminError::AdminNotSet));
    }

    #[test]
    fn test_old_admin_loses_access_after_transfer() {
        let env = make_env();
        let admin = Address::generate(&env);
        let successor = Address::generate(&env);
        set_admin(&env, &admin);
        propose_new_admin(&env, successor.clone()).unwrap();
        accept_admin(&env).unwrap();

        // Current admin is now successor
        assert_eq!(get_admin(&env), successor);
        assert_ne!(get_admin(&env), admin);
    }
}