//! # Custom Types for Split Escrow Contract
//!
//! I'm defining all the core data structures here to keep them organized
//! and easily importable throughout the contract.
//!
//! This module includes both the original types and the enhanced escrow
//! types as specified in issue #59.

use soroban_sdk::{contracterror, contracttype, Address, Env, String, Vec};
// ============================================
// Original Types (preserved for compatibility)
// ============================================

/// Status of a split throughout its lifecycle
///
/// I designed these states to cover the full lifecycle:
/// - Pending: Created but no deposits yet
/// - Active: At least one deposit received
/// - Completed: All participants have paid their share
/// - Released: Funds have been released to the creator
/// - Cancelled: Split was cancelled, refunds may be needed
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SplitStatus {
    Pending,
    Active,
    Completed,
    Released,
    Cancelled,
}

/// A participant in a split
///
/// I'm tracking both the owed amount and paid amount separately
/// to support partial payments and payment verification.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Participant {
    /// The participant's Stellar address
    pub address: Address,

    /// The amount this participant owes
    pub share_amount: i128,

    /// The amount this participant has paid so far
    pub amount_paid: i128,

    /// Whether the participant has fully paid their share
    pub has_paid: bool,
}

/// A bill split record
///
/// I'm storing all split data in a single struct for atomic operations.
/// The participants vector allows any number of people to share a bill.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Split {
    /// Unique identifier for this split
    pub id: u64,

    /// The address that created this split
    pub creator: Address,

    /// Human-readable description (e.g., "Dinner at Joe's")
    pub description: String,

    /// Total amount to be split among participants
    pub total_amount: i128,

    /// Amount collected so far from participants
    pub amount_collected: i128,

    /// Amount already released to the creator
    pub amount_released: i128,

    /// List of participants and their share details
    pub participants: Vec<Participant>,

    /// Current status of the split
    pub status: SplitStatus,

    /// Timestamp when the split was created
    pub created_at: u64,
}

/// Contract errors
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RewardsStatus {
    Active = 0,
    Claimed = 1,
    Suspended = 2,
}

/// User rewards data structure
#[contracttype]
#[derive(Clone, Debug)]
pub struct UserRewards {
    pub user: Address,
    pub total_splits_created: u64,
    pub total_splits_participated: u64,
    pub total_amount_transacted: i128,
    pub rewards_earned: i128,
    pub rewards_claimed: i128,
    pub last_activity: u64,
    pub status: RewardsStatus,
}

/// User activity tracking for rewards calculation
#[contracttype]
#[derive(Clone, Debug)]
pub struct UserActivity {
    pub user: Address,
    pub activity_type: ActivityType,
    pub split_id: u64,
    pub amount: i128,
    pub timestamp: u64,
}

/// Types of activities that earn rewards
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum ActivityType {
    SplitCreated = 0,
    SplitParticipated = 1,
    DepositMade = 2,
    SplitCompleted = 3,
}

/// Verification status for split legitimacy
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum VerificationStatus {
    Pending = 0,
    Verified = 1,
    Rejected = 2,
    Expired = 3,
}

/// Verification request for split legitimacy
#[contracttype]
#[derive(Clone, Debug)]
pub struct VerificationRequest {
    pub verification_id: String,
    pub split_id: String,
    pub requester: Address,
    pub receipt_hash: String,
    pub evidence_url: Option<String>,
    pub submitted_at: u64,
    pub status: VerificationStatus,
    pub verified_by: Option<Address>,
    pub verified_at: Option<u64>,
    pub rejection_reason: Option<String>,
}

/// Oracle configuration and settings
#[contracttype]
#[derive(Clone, Debug)]
pub struct OracleConfig {
    pub required_verifications: u32,
    pub verification_timeout: u64,
    pub min_oracles: u32,
    pub oracle_addresses: Vec<Address>,
}

/// Atomic swap status
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum SwapStatus {
    Pending = 0,
    Completed = 1,
    Refunded = 2,
    Expired = 3,
}

/// Atomic swap contract for instant settlements
#[contracttype]
#[derive(Clone, Debug)]
pub struct AtomicSwap {
    pub swap_id: String,
    pub participant_a: Address,
    pub participant_b: Address,
    pub amount_a: i128,
    pub amount_b: i128,
    pub hash_lock: String,
    pub secret: Option<String>,
    pub time_lock: u64,
    pub created_at: u64,
    pub status: SwapStatus,
    pub completed_at: Option<u64>,
}

/// Oracle node information
#[contracttype]
#[derive(Clone, Debug)]
pub struct OracleNode {
    pub oracle_address: Address,
    pub stake: i128,
    pub reputation: u64,
    pub submissions_count: u64,
    pub last_submission: u64,
    pub active: bool,
}

/// Price submission from oracle
#[contracttype]
#[derive(Clone, Debug)]
pub struct PriceSubmission {
    pub oracle_address: Address,
    pub asset_pair: String,
    pub price: i128,
    pub timestamp: u64,
    pub signature: String,
}

/// Consensus price data
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct ConsensusPrice {
    pub asset_pair: String,
    pub price: i128,
    pub confidence: u32, // BPS (e.g. 9500 for 95%)
    pub participating_oracles: u32,
    pub timestamp: u64,
}

/// Bridge transaction status
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum BridgeStatus {
    Initiated = 0,
    Completed = 1,
    Refunded = 2,
    Failed = 3,
}

/// Cross-chain bridge transaction
#[contracttype]
#[derive(Clone, Debug)]
pub struct BridgeTransaction {
    pub bridge_id: String,
    pub source_chain: String,
    pub destination_chain: String,
    pub amount: i128,
    pub recipient: String,
    pub sender: Address,
    pub created_at: u64,
    pub status: BridgeStatus,
    pub proof_hash: Option<String>,
    pub completed_at: Option<u64>,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    SplitNotFound = 1,
    SplitCancelled = 2,
    SplitReleased = 3,
    SplitNotFunded = 4,
    SplitFullyFunded = 5,
    NoFundsAvailable = 6,
    InvalidAmount = 7,
    InsuranceNotFound = 8,
    InsuranceAlreadyExists = 9,
    ClaimNotFound = 10,
    InvalidClaimStatus = 11,
    InsufficientPremium = 12,
    InsuranceExpired = 13,
    ParticipantNotFound = 14,
    UserNotFound = 15,
    InsufficientRewards = 16,
    RewardsAlreadyClaimed = 17,
    VerificationNotFound = 18,
    VerificationAlreadyExists = 19,
    InvalidVerificationStatus = 20,
    OracleNotAuthorized = 21,
    InsufficientOracles = 22,
    SwapNotFound = 23,
    SwapAlreadyExists = 24,
    InvalidSwapStatus = 25,
    SecretInvalid = 26,
    SwapExpired = 27,
    OracleNotRegistered = 28,
    InsufficientStake = 29,
    PriceSubmissionInvalid = 30,
    BridgeNotFound = 31,
    BridgeAlreadyExists = 32,
    InvalidBridgeStatus = 33,
    ProofInvalid = 34,
    EscrowNotRefundable = 35,
    ParticipantAlreadyRefunded = 36,
    SplitNotCompleted = 37,
}

// No manual From implementation needed for #[contracterror]

/// Configuration for the contract
///
/// I'm keeping this minimal for now but it can be extended
/// to include fee settings, limits, etc.
#[contracttype]
#[derive(Clone, Debug)]
pub struct ContractConfig {
    /// The contract administrator address
    pub admin: Address,

    /// Whether the contract is paused
    pub is_paused: bool,
}

// ============================================
// Insurance Types
// ============================================

/// Status of an insurance policy
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum InsuranceStatus {
    /// Insurance is active and providing coverage
    Active,
    /// Insurance has expired
    Expired,
    /// Insurance has been claimed and paid out
    Claimed,
    /// Insurance was cancelled
    Cancelled,
}

/// Status of an insurance claim
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ClaimStatus {
    /// Claim has been submitted and is pending review
    Pending,
    /// Claim has been approved and will be paid out
    Approved,
    /// Claim has been rejected
    Rejected,
    /// Claim has been paid out
    Paid,
}

/// Insurance policy for split protection
#[contracttype]
#[derive(Clone, Debug)]
pub struct InsurancePolicy {
    /// Unique identifier for this insurance policy
    pub insurance_id: String,
    
    /// The split ID being insured
    pub split_id: String,
    
    /// The address that purchased the insurance
    pub policy_holder: Address,
    
    /// Premium amount paid for the insurance
    pub premium: i128,
    
    /// Coverage amount (maximum payout)
    pub coverage_amount: i128,
    
    /// Current status of the insurance
    pub status: InsuranceStatus,
    
    /// Timestamp when the insurance was purchased
    pub created_at: u64,
    
    /// Timestamp when the insurance expires
    pub expires_at: u64,
}

/// Insurance claim for split protection
#[contracttype]
#[derive(Clone, Debug)]
pub struct InsuranceClaim {
    /// Unique identifier for this claim
    pub claim_id: String,
    
    /// The insurance policy ID this claim is against
    pub insurance_id: String,
    
    /// The address filing the claim
    pub claimant: Address,
    
    /// Reason for the claim
    pub reason: String,
    
    /// Amount being claimed
    pub claim_amount: i128,
    
    /// Current status of the claim
    pub status: ClaimStatus,
    
    /// Timestamp when the claim was filed
    pub filed_at: u64,
    
    /// Optional timestamp when the claim was processed
    pub processed_at: Option<u64>,
    
    /// Optional notes about the claim decision
    pub notes: Option<String>,
}

// ============================================
// Enhanced Escrow Types (Issue #59)
// ============================================

/// Escrow status enum matching issue #59 specification
///
/// I'm using a separate enum for the escrow system to clearly
/// distinguish between the original split flow and the new escrow flow.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowStatus {
    /// Escrow is active and accepting payments
    Active,
    /// All payments received, ready for release
    Completed,
    /// Escrow was cancelled by creator
    Cancelled,
    /// Deadline passed without completion
    Expired,
    /// Funds have been released to the creator
    Released,
}

/// Enhanced participant structure with payment timestamp
///
/// I'm adding `paid_at` to track exactly when each participant
/// completed their payment, which is useful for auditing and disputes.
#[contracttype]
#[derive(Clone, Debug)]
pub struct EscrowParticipant {
    /// The participant's Stellar address
    pub address: Address,

    /// The amount this participant owes
    pub amount_owed: i128,

    /// The amount this participant has paid so far
    pub amount_paid: i128,

    /// Timestamp when the participant fully paid (None if not yet paid)
    pub paid_at: Option<u64>,
}

/// Main escrow structure matching issue #59 specification
///
/// I designed this to support the full escrow lifecycle with
/// deadline enforcement and detailed participant tracking.
#[contracttype]
#[derive(Clone, Debug)]
pub struct SplitEscrow {
    /// Unique split identifier (string format for flexibility)
    pub split_id: String,

    /// Split creator address (who receives funds on completion)
    pub creator: Address,

    /// Human-readable description of the split
    pub description: String,

    /// Total amount to be collected from all participants
    pub total_amount: i128,

    /// Amount collected so far
    pub amount_collected: i128,

    /// List of participants and their payment details
    pub participants: Vec<EscrowParticipant>,

    /// The requester of the split (usually same as creator or oracle)
    pub requester: Address,

    /// Current status of the escrow
    pub status: EscrowStatus,

    /// Unix timestamp deadline for payment completion
    pub deadline: u64,

    /// Unix timestamp when the escrow was created
    pub created_at: u64,
}

// ============================================
// Validation Helpers
// ============================================

impl SplitEscrow {
    /// Check if the escrow has expired based on current timestamp
    ///
    /// I'm providing this helper so contract logic can easily
    /// check expiry without duplicating the comparison everywhere.
    pub fn is_expired(&self, current_timestamp: u64) -> bool {
        current_timestamp > self.deadline && self.status == EscrowStatus::Active
    }

    /// Validate escrow invariants
    ///
    /// I'm checking that the escrow data is internally consistent:
    /// - Amount collected doesn't exceed total
    /// - Participant amounts sum correctly
    /// - Status matches the payment state
    pub fn validate(&self) -> Result<(), &'static str> {
        // Check amount bounds
        if self.amount_collected > self.total_amount {
            return Err("Collected amount exceeds total");
        }

        if self.amount_collected < 0 || self.total_amount < 0 {
            return Err("Amounts cannot be negative");
        }

        // Verify participant amounts sum correctly
        let mut participant_total: i128 = 0;
        let mut paid_total: i128 = 0;

        for i in 0..self.participants.len() {
            let p = self.participants.get(i).unwrap();
            participant_total += p.amount_owed;
            paid_total += p.amount_paid;

            // Each participant's paid amount shouldn't exceed owed
            if p.amount_paid > p.amount_owed {
                return Err("Participant overpaid");
            }
        }

        // Total owed should match escrow total
        if participant_total != self.total_amount {
            return Err("Participant amounts don't sum to total");
        }

        // Collected should match sum of paid amounts
        if paid_total != self.amount_collected {
            return Err("Collected amount mismatch");
        }

        Ok(())
    }

    /// Check if all participants have fully paid
    pub fn is_fully_funded(&self) -> bool {
        self.amount_collected >= self.total_amount
    }

    /// Get the remaining amount needed to complete the escrow
    pub fn remaining_amount(&self) -> i128 {
        self.total_amount - self.amount_collected
    }
}

impl EscrowParticipant {
    /// Validate participant data
    ///
    /// I'm ensuring the participant data is internally consistent.
    pub fn validate(&self) -> Result<(), &'static str> {
        if self.amount_owed < 0 {
            return Err("Amount owed cannot be negative");
        }

        if self.amount_paid < 0 {
            return Err("Amount paid cannot be negative");
        }

        if self.amount_paid > self.amount_owed {
            return Err("Amount paid exceeds amount owed");
        }

        // If fully paid, paid_at should be set
        if self.amount_paid >= self.amount_owed && self.paid_at.is_none() {
            return Err("Fully paid participant missing paid_at timestamp");
        }

        Ok(())
    }

    /// Check if participant has fully paid their share
    pub fn has_fully_paid(&self) -> bool {
        self.amount_paid >= self.amount_owed
    }

    /// Get remaining amount owed by this participant
    pub fn remaining_owed(&self) -> i128 {
        self.amount_owed - self.amount_paid
    }
}

// ============================================
// Factory Functions
// ============================================

impl EscrowParticipant {
    /// Create a new participant with zero payments
    pub fn new(address: Address, amount_owed: i128) -> Self {
        Self {
            address,
            amount_owed,
            amount_paid: 0,
            paid_at: None,
        }
    }
}

/// Helper to create a new escrow with default values
///
/// I'm providing this to ensure escrows are created consistently.
pub fn create_escrow(
    env: &Env,
    split_id: String,
    creator: Address,
    description: String,
    total_amount: i128,
    participants: Vec<EscrowParticipant>,
    deadline: u64,
) -> SplitEscrow {
    SplitEscrow {
        split_id,
        creator: creator.clone(),
        description,
        total_amount,
        amount_collected: 0,
        participants,
        requester: creator.clone(), // Use creator as default requester
        status: EscrowStatus::Active,
        deadline,
        created_at: env.ledger().timestamp(),
    }
}

