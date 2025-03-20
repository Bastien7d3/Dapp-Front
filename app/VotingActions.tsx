"use client";

import {useState, useEffect} from "react";
import {ethers} from "ethers";
import {Vote, Users, Clock, CheckCircle2, AlertCircle, Loader2} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Badge} from "@/components/ui/badge";
import styles from "./VotingActions.module.css";
import {handleWebpackExternalForEdgeRuntime} from "next/dist/build/webpack/plugins/middleware-plugin";

interface VotingActionsProps {
    contract: ethers.Contract | null;
    currentAccount: string | null;
}

export default function VotingActions({contract, currentAccount}: VotingActionsProps) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [newVoter, setNewVoter] = useState("");
    const [proposal, setProposal] = useState("");
    const [voteId, setVoteId] = useState("");
    const [winner, setWinner] = useState<string | null>(null);
    const [proposals, setProposals] = useState<{ description: string; voteCount: number }[]>([]);
    const [workflowStatus, setWorkflowStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [quorumPercentage, setQuorumPercentage] = useState("");
    const [whitelist, setWhitelist] = useState<string[]>([]);

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
        setWorkflowStatus(status.toString());
    };

    // Ajouter un électeur à la liste blanche (admin seulement)
    const addVoter = async () => {
        if (!contract || !isAdmin) return;
        try {
            const tx = await contract.addVoter(newVoter);
            await tx.wait();
            alert("Électeur ajouté !");
            setNewVoter("");
            fetchWhitelist();
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
    useEffect(() => {
        if (contract) {
            fetchWinner();
        }
    }, []);

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
                proposalsArray.push({description: proposal.description, voteCount: Number(proposal.voteCount)});
            }
            setProposals(proposalsArray);
        } catch (error) {
            console.error("Erreur récupération propositions:", error);
        }
    };

    // Récupérer la liste blanche
    const fetchWhitelist = async () => {
        if (!contract) return;
        try {
            const list = await contract.getWhitelist();
            setWhitelist(list);
        } catch (error) {
            console.error("Erreur récupération liste blanche:", error);
        }
    };

    // Fonction pour obtenir le texte du statut du workflow
    const getWorkflowStatusText = (status: string | null) => {
        if (status === null) return "Inconnu";

        switch (status) {
            case "0":
                return "Enregistrement des électeurs";
            case "1":
                return "Enregistrement des propositions";
            case "2":
                return "Fin de l'enregistrement des propositions";
            case "3":
                return "Session de vote";
            case "4":
                return "Fin de la session de vote";
            case "5":
                return "Votes comptabilisés";
            default:
                return "Statut inconnu";
        }
    };

    // Fonction pour obtenir la couleur du statut
    const getStatusColor = (status: string | null) => {
        if (status === null) return "bg-gray-500";

        switch (status) {
            case "0":
                return "border-purple-500 text-purple-400";
            case "1":
                return "border-blue-500 text-blue-400";
            case "2":
                return "border-yellow-500 text-yellow-400";
            case "3":
                return "border-green-500 text-green-400";
            case "4":
                return "border-orange-500 text-orange-400";
            case "5":
                return "border-red-500 text-red-400";
            default:
                return "border-gray-500 text-gray-400";
        }
    };

    // Fonction pour changer le statut du workflow
    const handleChangeWorkflowStatus = async (nextStatus: string) => {
        if (!contract) return;

        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            let tx;

            switch (nextStatus) {
                case "1": // Démarrer l'enregistrement des propositions
                    tx = await contract.startProposalsRegistration();
                    break;
                case "2": // Terminer l'enregistrement des propositions
                    tx = await contract.endProposalsRegistration();
                    break;
                case "3": // Démarrer la session de vote
                    tx = await contract.startVotingSession();
                    break;
                case "4": // Terminer la session de vote
                    tx = await contract.endVotingSession();
                    break;
                case "5": // Comptabiliser les votes
                    tx = await contract.tallyVotes();
                    break;
                default:
                    throw new Error("Statut invalide");
            }

            await tx.wait();

            // Mettre à jour le statut du workflow
            const status = await contract.workflowStatus();
            setWorkflowStatus(status.toString());

            setSuccess("Le statut du workflow a été mis à jour avec succès !");
            setIsLoading(false);
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors du changement de statut.");
            setIsLoading(false);
        }
    };

    // Fonction pour définir le quorum
    const handleSetQuorum = async () => {
        if (!contract || !quorumPercentage) return;

        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            const tx = await contract.setQuorum(quorumPercentage);
            await tx.wait();

            setSuccess(`Le quorum a été défini à ${quorumPercentage}% avec succès !`);
            setQuorumPercentage("");

            setIsLoading(false);
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de la définition du quorum.");
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {isAdmin && (
                <div className="space-y-6 mt-6">
                    <Card className="border-cyan-500/30 bg-black/40 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-cyan-400 flex items-center">
                                <Clock className="mr-2 h-5 w-5"/>
                                Administration du vote
                            </CardTitle>
                            <CardDescription>
                                Gérez le processus de vote en tant qu'administrateur
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {error && (
                                <Alert variant="destructive" className="border-red-500 bg-red-950/20">
                                    <AlertCircle className="h-4 w-4"/>
                                    <AlertTitle>Erreur</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {success && (
                                <Alert className="border-green-500 bg-green-950/20">
                                    <CheckCircle2 className="h-4 w-4 text-green-400"/>
                                    <AlertTitle className="text-green-400">Succès</AlertTitle>
                                    <AlertDescription>{success}</AlertDescription>
                                </Alert>
                            )}

                            <div className="flex items-center justify-between">
                                <h3 className="font-medium">Statut actuel :</h3>
                                <Badge
                                    variant="outline"
                                    className={getStatusColor(workflowStatus)}
                                >
                                    {getWorkflowStatusText(workflowStatus)}
                                </Badge>
                            </div>

                            {/* Actions de changement de statut */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {workflowStatus === "0" && (
                                    <Button
                                        onClick={() => handleChangeWorkflowStatus("1")}
                                        disabled={isLoading}
                                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                                    >
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        Démarrer l'enregistrement des propositions
                                    </Button>
                                )}

                                {workflowStatus === "1" && (
                                    <Button
                                        onClick={() => handleChangeWorkflowStatus("2")}
                                        disabled={isLoading}
                                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                                    >
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        Terminer l'enregistrement des propositions
                                    </Button>
                                )}

                                {workflowStatus === "2" && (
                                    <Button
                                        onClick={() => handleChangeWorkflowStatus("3")}
                                        disabled={isLoading}
                                        className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
                                    >
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        Démarrer la session de vote
                                    </Button>
                                )}

                                {workflowStatus === "3" && (
                                    <Button
                                        onClick={() => handleChangeWorkflowStatus("4")}
                                        disabled={isLoading}
                                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                    >
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        Terminer la session de vote
                                    </Button>
                                )}

                                {workflowStatus === "4" && (
                                    <Button
                                        onClick={() => handleChangeWorkflowStatus("5")}
                                        disabled={isLoading}
                                        className="bg-gradient-to-r from-red-500 to-purple-500 hover:from-red-600 hover:to-purple-600"
                                    >
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        Comptabiliser les votes
                                    </Button>
                                )}
                            </div>

                            {/* Ajout d'électeurs (uniquement en phase 0) */}
                            {workflowStatus === "0" && (
                                <div className="mt-6 space-y-4">
                                    <h3 className="font-medium">Ajouter un électeur</h3>
                                    <div className="flex space-x-2">
                                        <Input
                                            placeholder="Adresse Ethereum de l'électeur"
                                            value={newVoter}
                                            onChange={(e) => setNewVoter(e.target.value)}
                                            className="bg-gray-900 border-gray-700 focus:border-cyan-500"
                                        />
                                        <Button
                                            onClick={addVoter}
                                            disabled={!newVoter || isLoading}
                                            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                                        >
                                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> :
                                                <Users className="mr-2 h-4 w-4"/>}
                                            Ajouter
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Définition du quorum */}
                            <div className="mt-6 space-y-4">
                                <h3 className="font-medium">Définir le quorum (pourcentage)</h3>
                                <div className="flex space-x-2">
                                    <Input
                                        type="number"
                                        placeholder="Pourcentage du quorum (ex: 50)"
                                        value={quorumPercentage}
                                        onChange={(e) => setQuorumPercentage(e.target.value)}
                                        className="bg-gray-900 border-gray-700 focus:border-cyan-500"
                                    />
                                    <Button
                                        onClick={handleSetQuorum}
                                        disabled={!quorumPercentage || isLoading}
                                        className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                                    >
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> :
                                            <CheckCircle2 className="mr-2 h-4 w-4"/>}
                                        Définir
                                    </Button>
                                </div>
                            </div>

                            {/* Liste des électeurs */}
                            {whitelist.length > 0 && (
                                <div className="mt-6 space-y-4">
                                    <h3 className="font-medium">Liste des électeurs ({whitelist.length})</h3>
                                    <div className="max-h-40 overflow-y-auto bg-gray-900 rounded-md p-2">
                                        {whitelist.map((voter, index) => (
                                            <div key={index} className="text-sm font-mono mb-1 text-gray-300">
                                                {voter}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}


            {winner && (
                <Card className="border-yellow-500/70 bg-yellow-500/10 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-yellow-400 flex items-center">
                            <CheckCircle2 className="mr-2 h-5 w-5"/>
                            Proposition Gagnante
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-yellow-300">{winner}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
