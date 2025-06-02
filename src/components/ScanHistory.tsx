"use client"
import { useState } from "react"
import { Trash2, Eye, Calendar, Check, X, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog"

interface AnalysisResult {
  riskLevel: "low" | "medium" | "high" | "critical" | "unknown"
  confidenceScore: number
  summary: string
  recommendations: string[]
  timestamp: string
  details?: string[]
}

interface ScanHistoryItem {
  id: string
  timestamp: string
  image: string
  imageData?: string
  result: AnalysisResult
}

interface ScanHistoryProps {
  history: ScanHistoryItem[]
  onHistoryUpdated: () => void
}

export default function ScanHistory({ history, onHistoryUpdated }: ScanHistoryProps) {
  const [selectedItem, setSelectedItem] = useState<ScanHistoryItem | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const getRiskConfig = (level: string) => {
    switch (level.toLowerCase()) {
      case "low":
        return {
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-100 dark:bg-green-900/30",
          borderColor: "border-green-300 dark:border-green-700",
          badgeVariant: "default" as const,
        }
      case "medium":
        return {
          color: "text-yellow-600 dark:text-yellow-400",
          bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
          borderColor: "border-yellow-300 dark:border-yellow-700",
          badgeVariant: "secondary" as const,
        }
      case "high":
        return {
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-100 dark:bg-orange-900/30",
          borderColor: "border-orange-300 dark:border-orange-700",
          badgeVariant: "destructive" as const,
        }
      case "critical":
        return {
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-100 dark:bg-red-900/30",
          borderColor: "border-red-300 dark:border-red-700",
          badgeVariant: "destructive" as const,
        }
      default:
        return {
          color: "text-slate-600 dark:text-slate-400",
          bgColor: "bg-slate-100 dark:bg-slate-800",
          borderColor: "border-slate-300 dark:border-slate-700",
          badgeVariant: "outline" as const,
        }
    }
  }

  const formatDate = (timestamp: string | number) => {
    const date = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp)
    return date.toLocaleString()
  }

  const handleDeleteItem = (id: string) => {
    const updatedHistory = history.filter((item) => item.id !== id)
    localStorage.setItem("scanHistory", JSON.stringify(updatedHistory))

    if (selectedItem && selectedItem.id === id) {
      setSelectedItem(null)
    }

    setShowDeleteConfirm(null)
    onHistoryUpdated()
  }

  const handleClearAll = () => {
    localStorage.removeItem("scanHistory")
    setSelectedItem(null)
    onHistoryUpdated()
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Scan History</h3>
        <p className="text-slate-600 dark:text-slate-400">Your scan results will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            {history.length} {history.length === 1 ? "Scan" : "Scans"} Recorded
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Click on any scan to view details</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All Scan History</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to clear all scan history? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll} className="bg-red-600 hover:bg-red-700">
                Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Table */}
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-lg border border-white/20 dark:border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Summary
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {history.map((item) => {
                const riskConfig = getRiskConfig(item.result.riskLevel)
                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(item.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={riskConfig.badgeVariant} className="capitalize">
                        {item.result.riskLevel} Risk
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200 max-w-xs truncate">
                      {item.result.summary}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {/* View Details Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Scan Details</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Image Preview */}
                              <div>
                                <div className="bg-slate-900 rounded-lg overflow-hidden mb-4">
                                  <img
                                    src={item.imageData || item.image || "/placeholder.svg"}
                                    alt="Scanned content"
                                    className="w-full h-auto object-contain"
                                  />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Scanned on {formatDate(item.timestamp)}
                                </p>
                              </div>

                              {/* Analysis Results */}
                              <div className="space-y-4">
                                {/* Risk Level */}
                                <Card className={`${riskConfig.bgColor} ${riskConfig.borderColor} border-2`}>
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className={`font-semibold ${riskConfig.color} capitalize`}>
                                          {item.result.riskLevel} Risk
                                        </h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                          {Math.round(item.result.confidenceScore)}% confidence
                                        </p>
                                      </div>
                                      <AlertTriangle className={`h-6 w-6 ${riskConfig.color}`} />
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Summary */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">Analysis Summary</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{item.result.summary}</p>
                                  </CardContent>
                                </Card>

                                {/* Details */}
                                {item.result.details && item.result.details.length > 0 && (
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-sm">Details</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <ul className="space-y-2">
                                        {item.result.details.map((detail, index) => (
                                          <li key={index} className="text-sm bg-slate-50 dark:bg-slate-800 p-2 rounded">
                                            {detail}
                                          </li>
                                        ))}
                                      </ul>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Recommendations */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-sm">Recommendations</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <ul className="space-y-2">
                                      {item.result.recommendations.map((rec, index) => (
                                        <li
                                          key={index}
                                          className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                                        >
                                          {rec}
                                        </li>
                                      ))}
                                    </ul>
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Delete Confirmation */}
                        {showDeleteConfirm === item.id ? (
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(null)}
                              className="text-slate-600 hover:text-slate-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
