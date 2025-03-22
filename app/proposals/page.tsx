"use client";

import {useState, useEffect} from "react";
import {ethers} from "ethers";
import {useRouter} from "next/navigation";
import {ArrowLeft, BarChart3, AlertCircle, Loader2, Plus, CheckCircle2} from 'lucide-react';
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Progress} from "@/components/ui/progress";
import CONTRACT_ABI from "@/contracts/VotingContract.json";

const CONTRACT_ADDRESS = "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F"; // Adresse de votre contrat


export default function ProposalsPage() {
    const router = useRouter();
    const [isConnected, setIsConnected] = useState(false);
    const [contract, setContract] = useState<ethers.Contract | null>(null);
    const [proposals, setProposals] = useState<{ id: number; description: string; voteCount: number }[]>([]);
    const [workflowStatus, setWorkflowStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newProposal, setNewProposal] = useState("");
    const [votersCount, setVotersCount] = useState<number>(0);
    const [totalVotes, setTotalVotes] = useState<number>(0);

    const connectToContract = async () => {
        try {
            setIsLoading(true);
            if (!window.ethereum) {
                setError("MetaMask n'est pas installé.");
                setIsLoading(false);
                return;
            }

            const accounts = await window.ethereum.request({method: "eth_requestAccounts"});
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            setContract(contractInstance);
            setAccount(accounts[0]);

            const status = await contractInstance.workflowStatus();
            setWorkflowStatus(status.toString());

            const voters = await contractInstance.votersCount();
            setVotersCount(Number(voters));

            const proposalsCount = await contractInstance.getProposalsCount();
            const proposalsArray = [];
            let votes = 0;

            for (let i = 0; i < proposalsCount; i++) {
                const proposal = await contractInstance.proposals(i);
                const voteCount = Number(proposal.voteCount);
                votes += voteCount;
                proposalsArray.push({
                    id: i,
                    description: proposal.description,
                    voteCount: voteCount
                });
            }

            setTotalVotes(votes);
            setProposals(proposalsArray);
            setIsConnected(true);
            setIsLoading(false);
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue.");
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.request({method: "eth_accounts"}).then((accounts: string[]) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    connectToContract();
                }
            });
        } else {
            setError("MetaMask n'est pas installé. Veuillez installer l'extension pour continuer.");
        }
    }, []);

    const handleSubmitProposal = async () => {
        if (!contract || !newProposal.trim()) return;

        try {
            setIsSubmitting(true);
            setError(null);
            setSuccess(null);

            const tx = await contract.submitProposal(newProposal);
            await tx.wait();

            const proposalsCount = await contract.getProposalsCount();
            const proposal = await contract.proposals(proposalsCount - 1);

            setProposals([...proposals, {
                id: proposalsCount - 1,
                description: proposal.description,
                voteCount: Number(proposal.voteCount)
            }]);

            setNewProposal("");
            setSuccess("Votre proposition a été soumise avec succès !");
            setIsSubmitting(false);
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de la soumission de la proposition.");
            setIsSubmitting(false);
        }
    };

    const canSubmitProposal = () => {
        return (
            isConnected &&
            workflowStatus === "1" &&
            newProposal.trim() !== ""
        );
    };

    const getVotePercentage = (voteCount: number) => {
        if (totalVotes === 0) return 0;
        return (voteCount / totalVotes) * 100;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
            <div className="container mx-auto px-4 py-8">
                <header className="flex items-center mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/')}
                        className="mr-4 text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="h-5 w-5 mr-1"/>
                        Retour
                    </Button>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Propositions
                    </h1>
                </header>

                <main className="space-y-8">
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

                    {isLoading ? (
                        <Card className="border-blue-500/30 bg-black/40 backdrop-blur-sm">
                            <CardContent className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-400 mr-2"/>
                                <p>Chargement des propositions...</p>
                            </CardContent>
                        </Card>
                    ) : isConnected ? (
                        <>
                            {workflowStatus === "1" && (
                                <Card className="border-purple-500/30 bg-black/40 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-purple-400">Soumettre une proposition</CardTitle>
                                        <CardDescription>
                                            Proposez une idée pour le vote.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-col space-y-4">
                                            <Input
                                                placeholder="Entrez votre proposition..."
                                                value={newProposal}
                                                onChange={(e) => setNewProposal(e.target.value)}
                                                className="bg-gray-900 border-gray-700 focus:border-purple-500"
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex justify-end">
                                        <Button
                                            onClick={handleSubmitProposal}
                                            disabled={!canSubmitProposal() || isSubmitting}
                                            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                    Soumission...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="mr-2 h-4 w-4"/>
                                                    Soumettre
                                                </>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            )}

                            <Card className="border-blue-500/30 bg-black/40 backdrop-blur-sm">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-blue-400 flex items-center">
                                                <BarChart3 className="mr-2 h-5 w-5"/>
                                                Liste des propositions
                                            </CardTitle>
                                            <CardDescription>
                                                {proposals.length} proposition(s) enregistrée(s)
                                            </CardDescription>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={`
                        ${workflowStatus === "0" ? "border-purple-500 text-purple-400" :
                                                workflowStatus === "1" ? "border-blue-500 text-blue-400" :
                                                    workflowStatus === "2" ? "border-yellow-500 text-yellow-400" :
                                                        workflowStatus === "3" ? "border-green-500 text-green-400" :
                                                            workflowStatus === "4" ? "border-orange-500 text-orange-400" :
                                                                "border-red-500 text-red-400"}
                      `}
                                        >
                                            {workflowStatus === "0" ? "Enregistrement des électeurs" :
                                                workflowStatus === "1" ? "Enregistrement des propositions" :
                                                    workflowStatus === "2" ? "Fin de l'enregistrement des propositions" :
                                                        workflowStatus === "3" ? "Session de vote" :
                                                            workflowStatus === "4" ? "Fin de la session de vote" :
                                                                "Votes comptabilisés"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {proposals.length > 0 ? (
                                        <div className="space-y-4">
                                            {proposals.map((proposal) => (
                                                <div
                                                    key={proposal.id}
                                                    className="p-4 border border-gray-800 rounded-md hover:border-blue-500/30 transition-colors"
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h3 className="font-medium text-lg">{proposal.description}</h3>
                                                        {(workflowStatus === "3" || workflowStatus === "4" || workflowStatus === "5") && (
                                                            <Badge variant="secondary"
                                                                   className="bg-blue-950/30 text-blue-400">
                                                                {proposal.voteCount} vote(s)
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {(workflowStatus === "3" || workflowStatus === "4" || workflowStatus === "5") && (
                                                        <div className="space-y-1">
                                                            <Progress
                                                                value={getVotePercentage(proposal.voteCount)}
                                                                className="h-2 bg-gray-800"
                                                                indicatorClassName="bg-gradient-to-r from-blue-500 to-purple-500"
                                                            />
                                                            <div className="text-xs text-gray-400 text-right">
                                                                {getVotePercentage(proposal.voteCount).toFixed(1)}% des
                                                                votes
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400">
                                            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                                            <p>Aucune proposition n'a encore été soumise.</p>
                                        </div>
                                    )}
                                </CardContent>
                                {workflowStatus === "3" && (
                                    <CardFooter>
                                        <Button
                                            onClick={() => router.push('/vote')}
                                            className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                                        >
                                            Voter pour une proposition
                                        </Button>
                                    </CardFooter>
                                )}
                            </Card>
                        </>
                    ) : (
                        <Card className="border-purple-500/30 bg-black/40 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-purple-400">Connexion requise</CardTitle>
                                <CardDescription>
                                    Veuillez vous connecter avec MetaMask pour accéder aux propositions.
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
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
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
