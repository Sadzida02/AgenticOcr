import { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Chip,
    TextField,
    InputAdornment,
    Tab,
    Tabs,
    CircularProgress,
    IconButton,
    Collapse,
    Tooltip,
} from "@mui/material";

import {
    Search,
    Close,
    Delete,
    CloudOff,
} from "@mui/icons-material";

import { motion, AnimatePresence } from "framer-motion";

import {
    getAllDocuments,
    deleteDocument,
    getFileUrl,
} from "../services/ocrService";

const API = "https://localhost:7051/api";

/* ================= TYPES ================= */

interface DocumentItem {
    id: string;
    fileName: string;
    fileType: string;
    fileSizeBytes: number;
    uploadedAt: string;
    status: string;
    resultCount: number;
}

interface OCRResult {
    id?: string;
    pipelineType: string;
    processingTimeMs: number;
    createdAt: string;
    rawText?: string;
    structuredJson?: string;
    simplifiedText?: string;
}

interface DocumentDetails {
    ocrResults: OCRResult[];
}

interface DocumentResultsProps {
    docId: string;
}

/* ================= MAIN PAGE ================= */

export default function HistoryPage(): React.ReactElement {
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const [previewId, setPreviewId] = useState<string | null>(null);

    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState<string>("");

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async (): Promise<void> => {
        try {
            const data: DocumentItem[] = await getAllDocuments();
            setDocuments(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (
        id: string,
        fileName: string
    ): Promise<void> => {
        if (!window.confirm(`Delete "${fileName}"?`)) return;

        try {
            await deleteDocument(id);

            setDocuments((prev) =>
                prev.filter((d) => d.id !== id)
            );
        } catch (err) {
            console.error("Failed to delete document:", err);
        }
    };

    const filtered: DocumentItem[] = documents.filter(
        (d: DocumentItem) =>
            d.fileName
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
    );

    return (
        <Box>
            <Typography
                variant="h3"
                sx={{
                    fontSize: "2rem",
                    mb: 1,
                }}
            >
                Results History
            </Typography>

            {/* Search */}
            <Card sx={{ mb: 2 }}>
                <CardContent>
                <TextField
    fullWidth
    size="small"
    placeholder="Search documents..."
    value={searchQuery}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        setSearchQuery(e.target.value)
    }
    slotProps={{
        input: {
            startAdornment: (
                <InputAdornment position="start">
                    <Search fontSize="small" />
                </InputAdornment>
            ),

            endAdornment: searchQuery ? (
                <InputAdornment position="end">
                    <IconButton
                        size="small"
                        onClick={() => setSearchQuery("")}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                </InputAdornment>
            ) : undefined,
        },
    }}
/>
                </CardContent>
            </Card>

            {/* Loading */}
            {loading && (
                <Box
                    sx={{
                        textAlign: "center",
                        py: 4,
                    }}
                >
                    <CircularProgress />
                </Box>
            )}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
                <Card>
                    <CardContent
                        sx={{
                            textAlign: "center",
                            py: 4,
                        }}
                    >
                        <CloudOff
                            sx={{
                                fontSize: 50,
                                opacity: 0.5,
                                mb: 1,
                            }}
                        />

                        <Typography color="text.secondary">
                            No documents yet. Upload your first
                            document to get started.
                        </Typography>
                    </CardContent>
                </Card>
            )}

            {/* List */}
            <AnimatePresence>
                {filtered.map((doc: DocumentItem) => (
                    <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Card sx={{ mb: 2 }}>
                            <CardContent>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent:
                                            "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: 1,
                                    }}
                                >
                                    <Box sx={{ flex: 1 }}>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontSize: "1rem",
                                                mb: 0.5,
                                            }}
                                        >
                                            {doc.fileName}
                                        </Typography>

                                        <Box
                                            sx={{
                                                display: "flex",
                                                gap: 1,
                                                flexWrap: "wrap",
                                            }}
                                        >
                                            <Chip
                                                label={doc.status}
                                                size="small"
                                                color={
                                                    doc.status ===
                                                    "Done"
                                                        ? "success"
                                                        : doc.status ===
                                                          "Failed"
                                                        ? "error"
                                                        : "warning"
                                                }
                                            />

                                            <Chip
                                                label={`${(
                                                    doc.fileSizeBytes /
                                                    1024
                                                ).toFixed(1)} KB`}
                                                size="small"
                                                variant="outlined"
                                            />

                                            <Chip
                                                label={new Date(
                                                    doc.uploadedAt
                                                ).toLocaleDateString()}
                                                size="small"
                                                variant="outlined"
                                            />

                                            {doc.resultCount > 0 && (
                                                <Chip
                                                    label={`${doc.resultCount} result${
                                                        doc.resultCount >
                                                        1
                                                            ? "s"
                                                            : ""
                                                    }`}
                                                    size="small"
                                                    color="info"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    <Box
                                        sx={{
                                            display: "flex",
                                            gap: 1,
                                            alignItems: "center",
                                        }}
                                    >
                                        <Tooltip
                                            title={
                                                previewId === doc.id
                                                    ? "Hide Preview"
                                                    : "Preview Document"
                                            }
                                        >
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() =>
                                                    setPreviewId(
                                                        previewId ===
                                                            doc.id
                                                            ? null
                                                            : doc.id
                                                    )
                                                }
                                            >
                                                {previewId === doc.id
                                                    ? "Hide"
                                                    : "Preview"}
                                            </Button>
                                        </Tooltip>

                                        <Tooltip
                                            title={
                                                expandedId === doc.id
                                                    ? "Hide Results"
                                                    : "View Results"
                                            }
                                        >
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() =>
                                                    setExpandedId(
                                                        expandedId ===
                                                            doc.id
                                                            ? null
                                                            : doc.id
                                                    )
                                                }
                                            >
                                                Results
                                            </Button>
                                        </Tooltip>

                                        <Tooltip title="Delete Document">
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() =>
                                                    handleDelete(
                                                        doc.id,
                                                        doc.fileName
                                                    )
                                                }
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>

                                {/* Preview */}
                                <Collapse in={previewId === doc.id}>
                                    <Box sx={{ mt: 2 }}>
                                        {doc.fileType ===
                                        "application/pdf" ? (
                                            <Box
                                                component="iframe"
                                                src={getFileUrl(doc.id)}
                                                sx={{
                                                    width: "100%",
                                                    height: 400,
                                                    border: "1px solid",
                                                    borderColor:
                                                        "divider",
                                                    borderRadius: 1,
                                                }}
                                                title={`Preview of ${doc.fileName}`}
                                            />
                                        ) : (
                                            <Box
                                                component="img"
                                                src={getFileUrl(doc.id)}
                                                sx={{
                                                    maxWidth: "100%",
                                                    maxHeight: 400,
                                                    objectFit:
                                                        "contain",
                                                    border: "1px solid",
                                                    borderColor:
                                                        "divider",
                                                    borderRadius: 1,
                                                }}
                                                alt={`Preview of ${doc.fileName}`}
                                            />
                                        )}
                                    </Box>
                                </Collapse>

                                {/* Results */}
                                <Collapse in={expandedId === doc.id}>
                                    <Box sx={{ mt: 2 }}>
                                        <DocumentResults
                                            docId={doc.id}
                                        />
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </Box>
    );
}

/* ================= RESULTS COMPONENT ================= */

function DocumentResults({
    docId,
}: DocumentResultsProps): React.ReactElement {
    const [data, setData] =
        useState<DocumentDetails | null>(null);

    const [loading, setLoading] =
        useState<boolean>(true);

    const [tab, setTab] = useState<number>(0);

    const [error, setError] = useState<string | null>(
        null
    );

    useEffect(() => {
        const fetchDocumentDetails =
            async (): Promise<void> => {
                setLoading(true);
                setError(null);

                try {
                    const response = await fetch(
                        `${API}/documents/${docId}`
                    );

                    if (!response.ok) {
                        throw new Error(
                            `HTTP ${response.status}`
                        );
                    }

                    const result: DocumentDetails =
                        await response.json();

                    setData(result);
                } catch (err) {
                    setError((err as Error).message);

                    console.error(
                        "Failed to fetch document details:",
                        err
                    );
                } finally {
                    setLoading(false);
                }
            };

        fetchDocumentDetails();
    }, [docId]);

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    py: 2,
                }}
            >
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (error) {
        return (
            <Typography color="error" variant="body2">
                Failed to load results: {error}
            </Typography>
        );
    }

    if (!data || !data.ocrResults.length) {
        return (
            <Typography
                color="text.secondary"
                variant="body2"
            >
                No OCR results available for this
                document.
            </Typography>
        );
    }

    return (
        <Box>
            {data.ocrResults.map(
                (result: OCRResult, index: number) => (
                    <Card
                        key={result.id ?? index}
                        variant="outlined"
                        sx={{ mb: 2 }}
                    >
                        <CardContent>
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    alignItems: "center",
                                    mb: 2,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <Chip
                                        label={
                                            result.pipelineType
                                        }
                                        size="small"
                                        color={
                                            result.pipelineType ===
                                            "Baseline"
                                                ? "default"
                                                : "success"
                                        }
                                    />

                                    <Chip
                                        label={`${result.processingTimeMs}ms`}
                                        size="small"
                                        variant="outlined"
                                    />

                                    <Chip
                                        label={new Date(
                                            result.createdAt
                                        ).toLocaleString()}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                            </Box>

                            <Tabs
                                value={tab}
                                onChange={(
                                    _: React.SyntheticEvent,
                                    v: number
                                ) => setTab(v)}
                                sx={{
                                    mb: 2,
                                    borderBottom: 1,
                                    borderColor:
                                        "divider",
                                }}
                            >
                                <Tab label="Raw Text" />
                                <Tab label="Structured JSON" />
                                <Tab label="Simplified" />
                            </Tabs>

                            {tab === 0 && (
                                <Box
                                    component="pre"
                                    sx={{
                                        bgcolor: "grey.100",
                                        p: 2,
                                        borderRadius: 2,
                                        overflowX: "auto",
                                        whiteSpace:
                                            "pre-wrap",
                                        fontSize:
                                            "0.85rem",
                                        maxHeight: 400,
                                        overflowY:
                                            "auto",
                                        m: 0,
                                    }}
                                >
                                    {result.rawText ||
                                        "No raw text available"}
                                </Box>
                            )}

                            {tab === 1 && (
                                <Box
                                    component="pre"
                                    sx={{
                                        bgcolor: "grey.100",
                                        p: 2,
                                        borderRadius: 2,
                                        overflowX: "auto",
                                        whiteSpace:
                                            "pre-wrap",
                                        fontSize:
                                            "0.85rem",
                                        maxHeight: 400,
                                        overflowY:
                                            "auto",
                                        m: 0,
                                    }}
                                >
                                    {result.structuredJson
                                        ? (() => {
                                              try {
                                                  return JSON.stringify(
                                                      JSON.parse(
                                                          result.structuredJson
                                                      ),
                                                      null,
                                                      2
                                                  );
                                              } catch {
                                                  return result.structuredJson;
                                              }
                                          })()
                                        : "No structured data available"}
                                </Box>
                            )}

                            {tab === 2 && (
                                <Box
                                    sx={{
                                        bgcolor:
                                            "secondary.light",
                                        p: 2,
                                        borderRadius: 2,
                                        maxHeight: 400,
                                        overflowY:
                                            "auto",
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            lineHeight: 1.8,
                                        }}
                                    >
                                        {result.simplifiedText ||
                                            "No simplified text available"}
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                )
            )}
        </Box>
    );
}