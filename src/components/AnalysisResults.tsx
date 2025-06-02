"use client"
import { Shield, AlertTriangle, AlertCircle, CheckCircle, Clock, TrendingUp, Eye, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"

interface AnalysisResult {
  riskLevel: "low" | "medium" | "high" | "critical" | "safe" | "unknown"
  confidenceScore: number
  summary: string
  recommendations: string[]
  timestamp: string
  details?: string[]
}

interface AnalysisResultsProps {
  result: AnalysisResult | null
  isLoading: boolean
}

export default function AnalysisResults({ result, isLoading }: AnalysisResultsProps) {
  const getRiskConfig = (level: string) => {
    switch (level.toLowerCase()) {
      case "safe":
        return {
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-100 dark:bg-green-900/30",
          borderColor: "border-green-300 dark:border-green-700",
          icon: CheckCircle,
          label: "Safe",
        }
      case "low":
        return {
          color: "text-yellow-600 dark:text-yellow-400",
          bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
          borderColor: "border-yellow-300 dark:border-yellow-700",
          icon: Info,
          label: "Low Risk",
        }
      case "medium":
        return {
          color: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-100 dark:bg-orange-900/30",
          borderColor: "border-orange-300 dark:border-orange-700",
          icon: AlertTriangle,
          label: "Medium Risk",
        }
      case "high":
        return {
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-100 dark:bg-red-900/30",
          borderColor: "border-red-300 dark:border-red-700",
          icon: AlertCircle,
          label: "High Risk",
        }
      case "critical":
        return {
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-100 dark:bg-red-900/30",
          borderColor: "border-red-300 dark:border-red-700",
          icon: AlertCircle,
          label: "Critical Risk",
        }
      default:
        return {
          color: "text-slate-600 dark:text-slate-400",
          bgColor: "bg-slate-100 dark:bg-slate-800",
          borderColor: "border-slate-300 dark:border-slate-700",
          icon: Shield,
          label: "Unknown",
        }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-0 bg-blue-500 rounded-full animate-spin border-4 border-transparent border-t-blue-500"></div>
            <div className="relative bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full p-4">
              <Shield className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Analyzing Threat</h3>
          <p className="text-slate-600 dark:text-slate-400">AI is processing the captured image...</p>
        </div>

        {/* Loading Animation */}
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="text-center py-12">
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-slate-300 dark:bg-slate-600 rounded-full opacity-20"></div>
          <div className="relative bg-gradient-to-r from-slate-400 to-slate-500 rounded-full p-5">
            <Shield className="h-10 w-10 text-white" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Ready for Analysis</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Capture an image to begin threat detection</p>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 max-w-md mx-auto">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  CyberLens will analyze the captured image and provide security recommendations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const riskConfig = getRiskConfig(result.riskLevel)
  const RiskIcon = riskConfig.icon

  return (
    <div className="space-y-6">
      {/* Risk Level Header */}
      <Card className={`${riskConfig.bgColor} ${riskConfig.borderColor} border-2`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-white/50 dark:bg-slate-900/50`}>
                <RiskIcon className={`h-6 w-6 ${riskConfig.color}`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${riskConfig.color} capitalize`}>{riskConfig.label}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Threat Assessment Complete</p>
              </div>
            </div>
            <Badge variant="outline" className={`${riskConfig.color} border-current`}>
              {Math.round(result.confidenceScore)}% confidence
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Confidence Score
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-400">{Math.round(result.confidenceScore)}%</span>
        </div>
        <Progress value={result.confidenceScore} className="h-2" />
      </div>

      {/* Summary */}
      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <CardContent className="p-4">
          <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Analysis Summary</h4>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Analysis Details */}
      {result.details && result.details.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              Analysis Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {result.details.map((detail, index) => (
                <li
                  key={index}
                  className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-500 flex items-center justify-center">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                  </div>
                  <span className="text-sm text-green-700 dark:text-green-300">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Extracted Text Details */}
      {result.details && result.details.length > 0 && (
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Extracted Text Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
              <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono">
                {result.details.join("\n")}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timestamp */}
      <div className="flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
        <Clock className="h-3 w-3 mr-1" />
        Analysis completed: {new Date(result.timestamp).toLocaleString()}
      </div>
    </div>
  )
}
