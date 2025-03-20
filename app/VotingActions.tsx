"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import styles from "./VotingActions.module.css";

interface VotingActionsProps {
  contract: ethers.Contract | null;
  currentAccount: string | null;
}

export default function VotingActions({ contract, currentAccount }: VotingActionsProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [newVoter, setNewVoter] = useState("");
  const [proposal, setProposal] = useState("");
  const [voteId, setVoteId] = useState("");
  const [winner, setWinner] = useState<string | null>(null);
  const [proposals, setProposals] = useState<{ description: string; voteCount: number }[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<number | null>(null);
  
  useEffect(() => {
    if (contract) {
      fetchWorkflowStatus();
      checkIfAdmin();
      fetchProposals();
    }
  }, [contract, currentAccount]);

  // Vérifier si l'utilisateur est l'admin
  const checkIfAdmin = async () => {
    if (!contract || !currentAccount) return;
    const owner = await contract.owner();
    setIsAdmin(owner.toLowerCase() === currentAccount.toLowerCase());
  };

  // Récupérer l'état du workflow
  const fetchWorkflowStatus = async () => {
    if (!contract) return;
    const status = await contract.workflowStatus();
    setWorkflowStatus(Number(status));
  };

  // Ajouter un électeur à la liste blanche (admin seulement)
  const addVoter = async () => {
    if (!contract || !isAdmin) return;
    try {
      const tx = await contract.addVoter(newVoter);
      await tx.wait();
      alert("Électeur ajouté !");
      setNewVoter("");
    } catch (error) {
      console.error("Erreur ajout électeur:", error);
    }
  };

  // Commencer l'enregistrement des propositions (admin)
  const startProposals = async () => {
    if (!contract || !isAdmin) return;
    try {
      const tx = await contract.startProposalsRegistration();
      await tx.wait();
      alert("Début de l'enregistrement des propositions !");
      fetchWorkflowStatus();
    } catch (error) {
      console.error("Erreur début propositions:", error);
    }
  };

  // Ajouter une proposition (électeur inscrit)
  const submitProposal = async () => {
    if (!contract) return;
    try {
      const tx = await contract.submitProposal(proposal);
      await tx.wait();
      alert("Proposition enregistrée !");
      setProposal("");
      fetchProposals();
    } catch (error) {
      console.error("Erreur soumission proposition:", error);
    }
  };

  // Terminer l'enregistrement des propositions (admin)
  const endProposals = async () => {
    if (!contract || !isAdmin) return;
    try {
      const tx = await contract.endProposalsRegistration();
      await tx.wait();
      alert("Fin de l'enregistrement des propositions !");
      fetchWorkflowStatus();
    } catch (error) {
      console.error("Erreur fin propositions:", error);
    }
  };

  // Commencer la session de vote (admin)
  const startVoting = async () => {
    if (!contract || !isAdmin) return;
    try {
      const tx = await contract.startVotingSession();
      await tx.wait();
      alert("Session de vote commencée !");
      fetchWorkflowStatus();
    } catch (error) {
      console.error("Erreur début vote:", error);
    }
  };

  // Voter pour une proposition (électeur inscrit)
  const vote = async () => {
    if (!contract) return;
    try {
      const tx = await contract.vote(voteId);
      await tx.wait();
      alert("Vote enregistré !");
      setVoteId("");
    } catch (error) {
      console.error("Erreur vote:", error);
    }
  };

  // Terminer la session de vote (admin)
  const endVoting = async () => {
    if (!contract || !isAdmin) return;
    try {
      const tx = await contract.endVotingSession();
      await tx.wait();
      alert("Fin de la session de vote !");
      fetchWorkflowStatus();
    } catch (error) {
      console.error("Erreur fin vote:", error);
    }
  };

  // Comptabiliser les votes (admin)
  const tallyVotes = async () => {
    if (!contract || !isAdmin) return;
    try {
      const tx = await contract.tallyVotes();
      await tx.wait();
      alert("Votes comptabilisés !");
      fetchWinner();
    } catch (error) {
      console.error("Erreur comptabilisation:", error);
    }
  };

  // Récupérer la proposition gagnante
  const fetchWinner = async () => {
    if (!contract) return;
    try {
      const result = await contract.getWinningProposal();
      setWinner(result);
    } catch (error) {
      console.error("Erreur récupération gagnant:", error);
    }
  };

  // Récupérer toutes les propositions
  const fetchProposals = async () => {
    if (!contract) return;
    try {
      const count = await contract.getProposalsCount();
      const proposalsArray = [];
      for (let i = 0; i < count; i++) {
        const proposal = await contract.proposals(i);
        proposalsArray.push({ description: proposal.description, voteCount: Number(proposal.voteCount) });
      }
      setProposals(proposalsArray);
    } catch (error) {
      console.error("Erreur récupération propositions:", error);
    }
  };

  return (
    <div className={styles.actions}>
      {isAdmin && (
        <div className={styles.adminActions}>
          <h2>Actions Administrateur</h2>
          <input type="text" value={newVoter} onChange={(e) => setNewVoter(e.target.value)} placeholder="Adresse électeur" />
          <button onClick={addVoter}>Ajouter Électeur</button>
          <button onClick={startProposals}>Démarrer Enregistrement Propositions</button>
          <button onClick={endProposals}>Terminer Enregistrement Propositions</button>
          <button onClick={startVoting}>Démarrer Vote</button>
          <button onClick={endVoting}>Terminer Vote</button>
          <button onClick={tallyVotes}>Comptabiliser Votes</button>
        </div>
      )}

      <h2>Participation des Électeurs</h2>
      <input type="text" value={proposal} onChange={(e) => setProposal(e.target.value)} placeholder="Votre proposition" />
      <button onClick={submitProposal}>Soumettre Proposition</button>
      <input type="text" value={voteId} onChange={(e) => setVoteId(e.target.value)} placeholder="ID Proposition" />
      <button onClick={vote}>Voter</button>

      <h2>Propositions</h2>
      <ul>{proposals.map((p, i) => <li key={i}>{p.description} (Votes: {p.voteCount})</li>)}</ul>

      {winner && <h2>Proposition Gagnante : {winner}</h2>}
    </div>
  );
}
