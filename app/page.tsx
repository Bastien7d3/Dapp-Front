"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, Vote, BarChart3, Clock, Users, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {ethers} from "ethers";
import VotingActions from "@/app/VotingActions";
import CONTRACT_ABI from "@/contracts/VotingContract.json";

const CONTRACT_ADDRESS = "0x7a2088a1bFc9d81c55368AE168C2C02570cB814F"; // Adresse de votre contrat

export default function Home() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [proposalsCount, setProposalsCount] = useState<number | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

      try {
        const status = await contractInstance.workflowStatus();
        setWorkflowStatus(status.toString());
      } catch (err) {
        console.error("Erreur lors de l'appel à workflowStatus:", err);
      }

      try {
        const count = await contractInstance.getProposalsCount();
        setProposalsCount(Number(count));
      } catch (err) {
        console.error("Erreur lors de l'appel à getProposalsCount:", err);
        setProposalsCount(0);
      }

      setContract(contractInstance);
      setAccount(accounts[0]);
      setIsConnected(true);
      setIsLoading(false);
    } catch (err) {
      console.error("Erreur complète:", err);
      setError(err.message || "Une erreur est survenue.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      });
    }

    connectToContract();
  }, []);

  const handleDisconnect = () => {
    setAccount(null);
    setIsConnected(false);
    setContract(null);
    setProposalsCount(null);
    setWorkflowStatus(null);
    setError(null);
  };

  const getWorkflowStatusText = (status: string | null) => {
    if (status === null) return "Inconnu";

    switch (status) {
      case "0": return "Enregistrement des électeurs";
      case "1": return "Enregistrement des propositions";
      case "2": return "Fin de l'enregistrement des propositions";
      case "3": return "Session de vote";
      case "4": return "Fin de la session de vote";
      case "5": return "Votes comptabilisés";
      default: return "Statut inconnu";
    }
  };

  const getStatusColor = (status: string | null) => {
    if (status === null) return "bg-gray-500";

    switch (status) {
      case "0": return "bg-purple-500";
      case "1": return "bg-blue-500";
      case "2": return "bg-yellow-500";
      case "3": return "bg-green-500";
      case "4": return "bg-orange-500";
      case "5": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const formatAddress = (address: string | null) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="container mx-auto px-4 py-8">
          <header className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div className="flex items-center mb-4 md:mb-0">
              <Vote className="h-10 w-10 mr-3 text-green-400" />
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                Blockchain_Vote
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {isConnected ? (
                  <div className="flex items-center">
                    <Badge variant="outline" className="mr-2 px-3 py-1 border-green-500 text-green-400 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                      Connecté
                    </Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnect}
                        className="border-red-500 text-red-400 hover:bg-red-950 hover:text-red-300"
                    >
                      Déconnecter
                    </Button>
                  </div>
              ) : (
                  <Button
                      onClick={() => {
                        setError(null);
                        connectToContract();
                      }}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                  >
                    {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Connexion...
                        </div>
                    ) : (
                        <div className="flex items-center">
                          <Wallet className="mr-2 h-4 w-4" />
                          Connecter MetaMask
                        </div>
                    )}
                  </Button>
              )}
            </div>
          </header>

          <main className="space-y-8">
            {error && (
                <Card className="border-red-500 bg-red-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-red-400 flex items-center">
                      <AlertCircle className="mr-2 h-5 w-5" />
                      Erreur
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{error}</p>
                  </CardContent>
                  <CardFooter>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setError(null);
                          connectToContract();
                        }}
                        className="border-red-500 text-red-400 hover:bg-red-950 hover:text-red-300"
                    >
                      Réessayer
                    </Button>
                  </CardFooter>
                </Card>
            )}

            {isConnected && (
                <>
                  <VotingActions contract={contract} currentAccount={account}/>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-green-500/30 bg-black/40 backdrop-blur-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-green-400 flex items-center">
                          <Users className="mr-2 h-5 w-5" />
                          Compte
                        </CardTitle>
                        <CardDescription>Votre adresse Ethereum</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <code className="bg-gray-800 px-2 py-1 rounded text-sm break-all">
                            {account}
                          </code>
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(account || "")}
                              className="text-green-400 hover:text-green-300 hover:bg-green-950/30"
                          >
                            Copier
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-blue-500/30 bg-black/40 backdrop-blur-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-blue-400 flex items-center">
                          <BarChart3 className="mr-2 h-5 w-5" />
                          Propositions
                        </CardTitle>
                        <CardDescription>Nombre de propositions enregistrées</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-blue-400">
                          {proposalsCount !== null ? proposalsCount : "..."}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/proposals')}
                            className="border-blue-500/50 text-blue-400 hover:bg-blue-950/30"
                        >
                          Voir les propositions
                        </Button>
                      </CardFooter>
                    </Card>

                    <Card className="border-purple-500/30 bg-black/40 backdrop-blur-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-purple-400 flex items-center">
                          <Clock className="mr-2 h-5 w-5" />
                          Statut
                        </CardTitle>
                        <CardDescription>État actuel du processus de vote</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(workflowStatus)}`}></div>
                          <div className="text-lg font-medium">
                            {getWorkflowStatusText(workflowStatus)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-cyan-500/30 bg-black/40 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-cyan-400 flex items-center">
                        <Vote className="mr-2 h-5 w-5" />
                        Actions de vote
                      </CardTitle>
                      <CardDescription>
                        Gérez vos actions en fonction du statut actuel du processus
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {contract && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Link href="/vote">
                              <Button className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600">
                                <Vote className="mr-2 h-4 w-4" />
                                Voter
                              </Button>
                            </Link>
                            <Link href="/proposals">
                              <Button variant="outline" className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/30">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Voir les propositions
                              </Button>
                            </Link>
                          </div>
                      )}
                    </CardContent>
                  </Card>
                </>
            )}

            {!isConnected && !error && !isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500">
                      Bienvenue sur Blockchain_Vote
                    </h2>
                    <p className="text-gray-400 max-w-md mx-auto">
                      Connectez-vous avec MetaMask pour accéder à la plateforme de vote décentralisée.
                    </p>
                  </div>
                  <Button
                      onClick={() => {
                        setError(null);
                        connectToContract();
                      }}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
                      size="lg"
                  >
                    <Wallet className="mr-2 h-5 w-5" />
                    Connecter MetaMask
                  </Button>
                </div>
            )}
          </main>
        </div>

        <footer className="mt-16 py-6 border-t border-gray-800">
          <div className="container mx-auto px-4 text-center text-gray-500">
            <p>Blockchain_Vote - Plateforme de vote décentralisée &copy; {new Date().getFullYear()}</p>
          </div>
        </footer>
      </div>
  );
}
