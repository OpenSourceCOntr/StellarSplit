use soroban_sdk::{
    contracterror, contractimpl, contract, panic_with_error, Map, Bytes,
    Address, Env, String, Vec, Symbol,
    token::{Client as TokenClient, StellarAssetClient},
    testutils::{Ledger, Address as _},
};

mod storage;
mod types;
mod events;

#[cfg(test)]
mod test;

use crate::types::{
    SplitEscrow, EscrowParticipant, EscrowStatus, Error,
};

#[contract]
pub struct SplitEscrowContract;

#[contractimpl]
impl SplitEscrowContract {
    /// Initialize the contract with an admin and token address
    pub fn initialize(env: Env, admin: Address, token: Address) {
        admin.require_auth();
        storage::set_admin(&env, &admin);
        storage::set_token(&env, &token);
        storage::set_paused(&env, false);
    }

    /// Create a new split with the specified participants and amounts
    pub fn create_split(
        env: Env,
        creator: Address,
        description: String,
        total_amount: i128,
        participant_addresses: Vec<Address>,
        participant_shares: Vec<i128>,
        deadline: u64,
    ) -> String {
        creator.require_auth();

        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        if participant_addresses.len() != participant_shares.len() {
            panic!("Participant addresses and shares must have the same length");
        }

        if participant_addresses.is_empty() {
            panic!("At least one participant is required");
        }

        let mut shares_sum: i128 = 0;
        for i in 0..participant_shares.len() {
            shares_sum += participant_shares.get(i).unwrap();
        }
        if shares_sum != total_amount {
            panic!("Participant shares must sum to total amount");
        }

        let split_id_num = storage::increment_escrow_count(&env);
        let split_id = storage::format_number_as_string(&env, split_id_num);

        let mut participants = Vec::new(&env);
        for i in 0..participant_addresses.len() {
            let participant = EscrowParticipant {
                address: participant_addresses.get(i).unwrap(),
                amount_owed: participant_shares.get(i).unwrap(),
                amount_paid: 0,
                paid_at: None,
            };
            participants.push_back(participant);
        }

        let escrow = SplitEscrow {
            split_id: split_id.clone(),
            creator: creator.clone(),
            requester: creator.clone(),
            description: description.clone(),
            total_amount,
            amount_collected: 0,
            participants,
            status: EscrowStatus::Active,
            deadline: deadline,
            created_at: env.ledger().timestamp(),
        };

        storage::set_escrow(&env, &split_id, &escrow);

        events::emit_split_created(&env, split_id_num, &creator, total_amount);

        split_id
    }

    /// Deposit funds into a split
    pub fn deposit(env: Env, split_id_str: String, participant: Address, amount: i128) {
        participant.require_auth();

        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        let mut escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");

        if escrow.status == EscrowStatus::Active && env.ledger().timestamp() > escrow.deadline {
            escrow.status = EscrowStatus::Expired;
        }

        if amount <= 0 {
            panic!("Deposit amount must be positive");
        }

        if escrow.status == EscrowStatus::Expired {
            panic!("Escrow has expired");
        }

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }

        let mut found = false;
        let mut updated_participants = Vec::new(&env);

        for i in 0..escrow.participants.len() {
            let mut p = escrow.participants.get(i).unwrap();
            if p.address == participant {
                found = true;
                let remaining = p.amount_owed - p.amount_paid;
                if amount > remaining {
                    panic!("Deposit exceeds remaining amount owed");
                }

                p.amount_paid += amount;
                if p.amount_paid >= p.amount_owed {
                    p.paid_at = Some(env.ledger().timestamp());
                }
            }
            updated_participants.push_back(p);
        }

        if !found {
            panic!("Participant not found in escrow");
        }

        let token_address = storage::get_token(&env);
        let token_client = TokenClient::new(&env, &token_address);
        let contract_address = env.current_contract_address();
        token_client.transfer(&participant, &contract_address, &amount);

        escrow.participants = updated_participants;
        escrow.amount_collected += amount;

        if escrow.is_fully_funded() {
            escrow.status = EscrowStatus::Completed;
        }

        storage::set_escrow(&env, &split_id_str, &escrow);

        events::emit_deposit_received(&env, 0, &participant, amount);

        if escrow.is_fully_funded() {
            let _ = Self::release_funds_internal(&env, split_id_str, escrow);
        }
    }

    /// Release funds from a completed split to the creator
    pub fn release_funds(env: Env, split_id_str: String) -> Result<(), Error> {
        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        if !storage::has_escrow(&env, &split_id_str) {
            return Err(Error::SplitNotFound);
        }

        let escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");
        Self::release_funds_internal(&env, split_id_str, escrow).map(|_| ())
    }

    /// Claim a refund for a cancelled or expired split
    pub fn claim_refund(env: Env, split_id_str: String, participant: Address) -> Result<i128, Error> {
        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        let mut escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");

        // Check if escrow is in a refundable state
        if escrow.status == EscrowStatus::Active && env.ledger().timestamp() > escrow.deadline {
            escrow.status = EscrowStatus::Expired;
            storage::set_escrow(&env, &split_id_str, &escrow);
        }

        if escrow.status != EscrowStatus::Cancelled && escrow.status != EscrowStatus::Expired {
            return Err(Error::EscrowNotRefundable);
        }

        let mut found = false;
        let mut refund_amount: i128 = 0;
        let mut updated_participants = Vec::new(&env);

        for i in 0..escrow.participants.len() {
            let mut p = escrow.participants.get(i).unwrap();
            if p.address == participant {
                found = true;
                participant.require_auth();
                
                if p.amount_paid <= 0 {
                    return Err(Error::NoFundsAvailable);
                }

                refund_amount = p.amount_paid;
                p.amount_paid = 0;
                p.paid_at = None;
            }
            updated_participants.push_back(p);
        }

        if !found {
            return Err(Error::ParticipantNotFound);
        }

        if refund_amount <= 0 {
             return Err(Error::NoFundsAvailable);
        }

        let token_address = storage::get_token(&env);
        let token_client = TokenClient::new(&env, &token_address);
        token_client.transfer(&env.current_contract_address(), &participant, &refund_amount);

        escrow.participants = updated_participants;
        escrow.amount_collected -= refund_amount;
        storage::set_escrow(&env, &split_id_str, &escrow);

        events::emit_refund_issued(&env, 0, participant, refund_amount);

        Ok(refund_amount)
    }

    /// Cancel a split and mark for refunds
    pub fn cancel_split(env: Env, split_id_str: String) {
        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        let mut escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");
        escrow.creator.require_auth();

        if escrow.status == EscrowStatus::Completed {
            panic!("Cannot cancel a completed escrow");
        }

        escrow.status = EscrowStatus::Cancelled;
        storage::set_escrow(&env, &split_id_str, &escrow);

        events::emit_split_cancelled_legacy(&env, 0);
    }

    pub fn release_partial(env: Env, split_id_str: String) -> Result<i128, Error> {
        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        if !storage::has_escrow(&env, &split_id_str) {
            return Err(Error::SplitNotFound);
        }

        let escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");

        if escrow.status == EscrowStatus::Cancelled {
            return Err(Error::SplitCancelled);
        }

        let available = escrow.amount_collected;
        if available <= 0 {
            return Err(Error::NoFundsAvailable);
        }

        let token_address = storage::get_token(&env);
        let token_client = TokenClient::new(&env, &token_address);
        token_client.transfer(&env.current_contract_address(), &escrow.creator, &available);

        Ok(available)
    }

    pub fn is_fully_funded(env: Env, split_id_str: String) -> Result<bool, Error> {
        if !storage::has_escrow(&env, &split_id_str) {
            return Err(Error::SplitNotFound);
        }

        let escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");
        Ok(escrow.is_fully_funded())
    }

    /// Extend escrow deadline
    pub fn extend_deadline(env: Env, split_id_str: String, new_deadline: u64) {
        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        let mut escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");
        escrow.creator.require_auth();

        if new_deadline <= escrow.deadline {
            panic!("New deadline must be later than current");
        }

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }

        escrow.deadline = new_deadline;
        storage::set_escrow(&env, &split_id_str, &escrow);
    }

    /// Toggle contract pause state
    pub fn toggle_pause(env: Env) {
        let admin = storage::get_admin(&env);
        admin.require_auth();

        let current = storage::is_paused(&env);
        storage::set_paused(&env, !current);
    }

    /// Internal helper function to release funds
    fn release_funds_internal(env: &Env, split_id_str: String, mut escrow: SplitEscrow) -> Result<i128, Error> {
        if escrow.status == EscrowStatus::Cancelled {
            return Err(Error::SplitCancelled);
        }

        let total_amount = escrow.total_amount;
        
        let token_address = storage::get_token(env);
        let token_client = TokenClient::new(env, &token_address);
        token_client.transfer(&env.current_contract_address(), &escrow.creator, &total_amount);

        escrow.status = EscrowStatus::Released;
        storage::set_escrow(env, &split_id_str, &escrow);

        events::emit_funds_released(env, 0, escrow.creator.clone(), total_amount);

        Ok(total_amount)
    }

    pub fn get_split(env: Env, split_id_str: String) -> SplitEscrow {
        let mut escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");
        if escrow.status == EscrowStatus::Active && env.ledger().timestamp() > escrow.deadline {
            escrow.status = EscrowStatus::Expired;
        }
        escrow
    }
}