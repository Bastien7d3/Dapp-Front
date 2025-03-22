"use client"

import {useState, useEffect} from "react"
import type {ethers} from "ethers"
import {Users, Clock, CheckCircle2, AlertCircle, Loader2} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert"
import {Badge} from "@/components/ui/badge"

interface VotingActionsProps {
    contract: ethers.Contract | null
    currentAccount: string | null
}

export default function VotingActions({contract, currentAccount}: VotingActionsProps) {
    const [workflowStatus, setWorkflowStatus] = useState<string | null>(null)
    const [isOwner, setIsOwner] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [voterAddress, setVoterAddress] = useState("")
    const [quorumPercentage, setQuorumPercentage] = useState("")
    const [whitelist, setWhitelist] = useState<string[]>([])
    const [currentParticipation, setCurrentParticipation] = useState<number>(0)
    const [currentQuorum, setCurrentQuorum] = useState<number>(0)

    useEffect(() => {
        const checkOwner = async () => {
            if (!contract || !currentAccount) return

            try {
                const owner = await contract.owner()
                setIsOwner(owner.toLowerCase() === currentAccount.toLowerCase())

                const status = await contract.workflowStatus()
                setWorkflowStatus(status.toString())

                try {
                    const list = await contract.getWhitelist()
                    setWhitelist(list)
                } catch (err) {
                    console.error("Erreur lors de la récupération de la liste blanche:", err)
                }
            } catch (err) {
                console.error("Erreur lors de la vérification du propriétaire:", err)
            }
        }

        checkOwner()
    }, [contract, currentAccount])

    const handleAddVoter = async () => {
        if (!contract || !voterAddress) return

        try {
            setIsLoading(true)
            setError(null)
            setSuccess(null)

            const tx = await contract.addVoter(voterAddress)
            await tx.wait()

            setSuccess(`L'électeur ${voterAddress} a été ajouté avec succès !`)
            setVoterAddress("")

            const list = await contract.getWhitelist()
            setWhitelist(list)

            setIsLoading(false)
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de l'ajout de l'électeur.")
            setIsLoading(false)
        }
    }

    const fetchQuorumAndParticipation = async () => {
        if (!contract) return
        try {
            const quorum = await contract.quorumPercentage()
            setCurrentQuorum(Number(quorum))

            const participation = await contract.getCurrentParticipation()
            setCurrentParticipation(Number(participation))

            await fetchWhitelist()
        } catch (error) {
            console.error("Erreur récupération quorum/participation:", error)
        }
    }

    const fetchWhitelist = async () => {
        if (!contract) return
        try {
            const list = await contract.getWhitelist()
            setWhitelist(list)
        } catch (error) {
            console.error("Erreur lors de la récupération de la liste blanche:", error)
        }
    }

    useEffect(() => {
        const fetchWorkflowStatus = async () => {
            if (!contract) return
            try {
                const status = await contract.workflowStatus()
                setWorkflowStatus(status.toString())
            } catch (error) {
                console.error("Erreur lors de la récupération du statut du workflow:", error)
            }
        }

        const checkIfAdmin = async () => {
            if (!contract || !currentAccount) return
            try {
                const owner = await contract.owner()
                setIsOwner(owner.toLowerCase() === currentAccount.toLowerCase())
            } catch (error) {
                console.error("Erreur lors de la vérification du propriétaire:", error)
            }
        }

        const fetchProposals = async () => {
        }

        if (contract) {
            fetchWorkflowStatus()
            checkIfAdmin()
            fetchProposals()
            fetchQuorumAndParticipation()
        }
    }, [contract, currentAccount])

    const handleSetQuorum = async () => {
        if (!contract || !quorumPercentage) return

        try {
            setIsLoading(true)
            setError(null)
            setSuccess(null)

            const tx = await contract.setQuorum(quorumPercentage)
            await tx.wait()

            fetchQuorumAndParticipation()

            setSuccess(`Le quorum a été défini à ${quorumPercentage}% avec succès !`)
            setQuorumPercentage("")

            setIsLoading(false)
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors de la définition du quorum.")
            setIsLoading(false)
        }
    }

    const handleChangeWorkflowStatus = async (nextStatus: string) => {
        if (!contract) return

        try {
            setIsLoading(true)
            setError(null)
            setSuccess(null)

            if (nextStatus === "4") {
                await fetchQuorumAndParticipation()

                const totalVoters = whitelist.length
                if (totalVoters === 0) {
                    setError("Aucun électeur n'est inscrit.")
                    setIsLoading(false)
                    return
                }

                if (currentParticipation < currentQuorum) {
                    setError(
                        `Le quorum n'est pas atteint. Participation actuelle: ${currentParticipation}%, quorum requis: ${currentQuorum}%`,
                    )
                    setIsLoading(false)
                    return
                }
            }

            let tx

            switch (nextStatus) {
                case "1":
                    tx = await contract.startProposalsRegistration()
                    break
                case "2":
                    tx = await contract.endProposalsRegistration()
                    break
                case "3":
                    tx = await contract.startVotingSession()
                    break
                case "4":
                    tx = await contract.endVotingSession()
                    break
                case "5":
                    tx = await contract.tallyVotes()
                    break
                default:
                    throw new Error("Statut invalide")
            }

            await tx.wait()

            const status = await contract.workflowStatus()
            setWorkflowStatus(status.toString())

            setSuccess("Le statut du workflow a été mis à jour avec succès !")
            setIsLoading(false)
        } catch (err: any) {
            setError(err.message || "Une erreur est survenue lors du changement de statut.")
            setIsLoading(false)
        }
    }

    const getWorkflowStatusText = (status: string | null) => {
        if (status === null) return "Inconnu"

        switch (status) {
            case "0":
                return "Enregistrement des électeurs"
            case "1":
                return "Enregistrement des propositions"
            case "2":
                return "Fin de l'enregistrement des propositions"
            case "3":
                return "Session de vote"
            case "4":
                return "Fin de la session de vote"
            case "5":
                return "Votes comptabilisés"
            default:
                return "Statut inconnu"
        }
    }

    const getStatusColor = (status: string | null) => {
        if (status === null) return "bg-gray-500"

        switch (status) {
            case "0":
                return "border-purple-500 text-purple-400"
            case "1":
                return "border-blue-500 text-blue-400"
            case "2":
                return "border-yellow-500 text-yellow-400"
            case "3":
                return "border-green-500 text-green-400"
            case "4":
                return "border-orange-500 text-orange-400"
            case "5":
                return "border-red-500 text-red-400"
            default:
                return "border-gray-500 text-gray-400"
        }
    }

    if (!isOwner) {
        return null
    }

    return (
        <div className="space-y-6 mt-6">
            <Card className="border-cyan-500/30 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-cyan-400 flex items-center">
                        <Clock className="mr-2 h-5 w-5"/>
                        Administration du vote
                    </CardTitle>
                    <CardDescription>Gérez le processus de vote en tant qu'administrateur</CardDescription>
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
                        <Badge variant="outline" className={getStatusColor(workflowStatus)}>
                            {getWorkflowStatusText(workflowStatus)}
                        </Badge>
                    </div>

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

                    {workflowStatus === "0" && (
                        <div className="mt-6 space-y-4">
                            <h3 className="font-medium">Ajouter un électeur</h3>
                            <div className="flex space-x-2">
                                <Input
                                    placeholder="Adresse Ethereum de l'électeur"
                                    value={voterAddress}
                                    onChange={(e) => setVoterAddress(e.target.value)}
                                    className="bg-gray-900 border-gray-700 focus:border-cyan-500"
                                />
                                <Button
                                    onClick={handleAddVoter}
                                    disabled={!voterAddress || isLoading}
                                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> :
                                        <Users className="mr-2 h-4 w-4"/>}
                                    Ajouter
                                </Button>
                            </div>
                        </div>
                    )}

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
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4"/>
                                )}
                                Définir
                            </Button>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        <h3 className="font-medium">Informations sur le quorum</h3>
                        <div className="bg-gray-900 rounded-md p-4 space-y-2">
                            <div className="flex justify-between">
                                <span>Quorum requis:</span>
                                <span className="font-medium text-cyan-400">{currentQuorum}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Participation actuelle:</span>
                                <span
                                    className={`font-medium ${currentParticipation >= currentQuorum ? "text-green-400" : "text-red-400"}`}
                                >
                                    {currentParticipation}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Électeurs inscrits:</span>
                                <span>{whitelist.length}</span>
                            </div>
                            <div className="w-full bg-gray-700 h-2 rounded-full mt-2">
                                <div
                                    className={`h-2 rounded-full ${currentParticipation >= currentQuorum ? "bg-green-500" : "bg-red-500"}`}
                                    style={{width: `${Math.min(100, (currentParticipation / Math.max(1, currentQuorum)) * 100)}%`}}
                                ></div>
                            </div>
                            {workflowStatus === "3" && currentParticipation < currentQuorum && (
                                <Alert className="border-yellow-500 bg-yellow-950/20 mt-2">
                                    <AlertCircle className="h-4 w-4 text-yellow-400"/>
                                    <AlertTitle className="text-yellow-400">Attention</AlertTitle>
                                    <AlertDescription>
                                        Le quorum n'est pas encore atteint. La session de vote ne pourra pas être
                                        terminée tant que la
                                        participation n'atteindra pas {currentQuorum}%.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </div>

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
    )
}
