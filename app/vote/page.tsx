"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { Vote, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CONTRACT_ABI from "@/contracts/VotingContract.json";

// Les constantes sont préservées comme demandé
const CONTRACT_ADDRESS = "0x0B306BF915C4d645ff596e518fAf3F9669b97016";

export default function VotePage() {
    const router = useRouter();
    const [isConnected, setIsConnected] = useState(false);
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [proposals, setProposals] = useState<{ id: number; description: string; voteCount: number }[]>([]);
    const [selectedProposal, setSelectedProposal] = useState<number | null>(null);
    const [workflowStatus, setWorkflowStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isVoting, setIsVoting] = useState(false);
    const [voterInfo, setVoterInfo] = useState<{ hasVoted: boolean; votedProposalId: number } | null>(null);

    // Fonction pour se connecter au contrat
    const connectToContract = async () => {
        try {
            setIsLoading(true);
            if (!window.ethereum) {
                setError("MetaMask n'est pas installé.");
                setIsLoading(false);
                return;
            }

            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            setContract(contractInstance);
            setAccount(accounts[0]);

            // Récupérer le statut du workflow
            const status = await contractInstance.workflowStatus();
            setWorkflowStatus(status.toString());

            // Récupérer les informations de l'électeur
            try {
                const info = await contractInstance.getVoterInfo(accounts[0]);
                setVoterInfo({
                    hasVoted: info[0],
                    votedProposalId: Number(info[1])
                });
            } catch (err) {
                console.error("Erreur lors de la récupération des informations de l'électeur:", err);
            }

            // Récupérer les propositions
            const proposalsCount = await contractInstance.getProposalsCount();
            const proposalsArray = [];

            for (let i = 0; i < proposalsCount; i++) {
                const proposal = await contractInstance.proposals(i);
                proposalsArray.push({
                    id: i,
                    description: proposal.description,
                    voteCount: Number(proposal.voteCount)
                });
            }

            setProposals(proposalsArray);
            setIsConnected(true);
            setIsLoading(false);
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue.");
            setIsLoading(false);
        }
    };

    // Vérifier si MetaMask est déjà connecté au démarrage
    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    connectToContract();
                }
            });
        } else {
            setError("MetaMask n'est pas installé. Veuillez installer l'extension pour continuer.");
        }
    }, []);

    // Fonction pour voter
    const handleVote = async () => {
        if (!contract || selectedProposal === null) return;

        try {
            setIsVoting(true);
            setError(null);
            setSuccess(null);

            const tx = await contract.vote(selectedProposal);
            await tx.wait();

            // Mettre à jour les informations de l'électeur
            const info = await contract.getVoterInfo(account);
            setVoterInfo({
                hasVoted: info[0],
                votedProposalId: Number(info[1])
            });

            setSuccess("Votre vote a été enregistré avec succès !");
            setIsVoting(false);
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors du vote.");
            setIsVoting(false);
        }
    };

    // Vérifier si l'utilisateur peut voter
    const canVote = () => {
        return (
            isConnected &&
            workflowStatus === "3" && // Statut "Session de vote"
            !voterInfo?.hasVoted &&
            selectedProposal !== null
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <header className="flex items-center mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/')}
                        className="mr-4 text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="h-5 w-5 mr-1" />
                        Retour
                    </Button>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                        Voter pour une proposition
                    </h1>
                </header>

                {/* Main Content */}
                <main className="space-y-8">
                    {error && (
                        <Alert variant="destructive" className="border-red-500 bg-red-950/20">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erreur</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="border-green-500 bg-green-950/20">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                            <AlertTitle className="text-green-400">Succès</AlertTitle>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {isLoading ? (
                        <Card className="border-blue-500/30 bg-black/40 backdrop-blur-sm">
                            <CardContent className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-400 mr-2" />
                                <p>Chargement des propositions...</p>
                            </CardContent>
                        </Card>
                    ) : isConnected ? (
                        <>
                            {workflowStatus !== "3" ? (
                                <Card className="border-yellow-500/30 bg-black/40 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-yellow-400">Session de vote non active</CardTitle>
                                        <CardDescription>
                                            La session de vote n'est pas encore ouverte ou est déjà terminée.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p>Statut actuel : {workflowStatus === "2" ? "Fin de l'enregistrement des propositions" :
                                            workflowStatus === "4" ? "Fin de la session de vote" :
                                                workflowStatus === "5" ? "Votes comptabilisés" : "Autre"}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push('/')}
                                            className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-950/30"
                                        >
                                            Retour à l'accueil
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ) : voterInfo?.hasVoted ? (
                                <Card className="border-green-500/30 bg-black/40 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-green-400 flex items-center">
                                            <CheckCircle2 className="mr-2 h-5 w-5" />
                                            Vous avez déjà voté
                                        </CardTitle>
                                        <CardDescription>
                                            Votre vote a été enregistré pour la proposition suivante :
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="p-4 border border-green-500/30 rounded-md bg-green-950/10">
                                            <p className="font-medium text-lg">
                                                {proposals.find(p => p.id === voterInfo.votedProposalId)?.description ||
                                                    `Proposition #${voterInfo.votedProposalId}`}
                                            </p>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push('/')}
                                            className="border-green-500/50 text-green-400 hover:bg-green-950/30"
                                        >
                                            Retour à l'accueil
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ) : (
                                <Card className="border-blue-500/30 bg-black/40 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-blue-400">Choisissez une proposition</CardTitle>
                                        <CardDescription>
                                            Sélectionnez la proposition pour laquelle vous souhaitez voter.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {proposals.length > 0 ? (
                                            <RadioGroup
                                                value={selectedProposal?.toString()}
                                                onValueChange={(value) => setSelectedProposal(parseInt(value))}
                                                className="space-y-4"
                                            >
                                                {proposals.map((proposal) => (
                                                    <div key={proposal.id} className="flex items-center space-x-2 p-3 rounded-md border border-gray-800 hover:border-blue-500/50 hover:bg-blue-950/10 transition-colors">
                                                        <RadioGroupItem
                                                            value={proposal.id.toString()}
                                                            id={`proposal-${proposal.id}`}
                                                            className="text-blue-400 border-blue-500"
                                                        />
                                                        <Label
                                                            htmlFor={`proposal-${proposal.id}`}
                                                            className="flex-1 cursor-pointer font-medium"
                                                        >
                                                            {proposal.description}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        ) : (
                                            <p className="text-gray-400">Aucune proposition disponible.</p>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex justify-between">
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push('/')}
                                            className="border-gray-700 text-gray-400 hover:bg-gray-900"
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            onClick={handleVote}
                                            disabled={!canVote() || isVoting}
                                            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                                        >
                                            {isVoting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Vote en cours...
                                                </>
                                            ) : (
                                                <>
                                                    <Vote className="mr-2 h-4 w-4" />
                                                    Voter
                                                </>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}
                        </>
                    ) : (
                        <Card className="border-purple-500/30 bg-black/40 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-purple-400">Connexion requise</CardTitle>
                                <CardDescription>
                                    Veuillez vous connecter avec MetaMask pour accéder à la page de vote.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <Button
                                    onClick={connectToContract}
                                    disabled={isLoading}
                                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Connexion...
                                        </>
                                    ) : (
                                        <>
                                            Connecter avec MetaMask
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </main>
            </div>
        </div>
    );
}
