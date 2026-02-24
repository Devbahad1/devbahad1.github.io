import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Button, TextField, Card, Typography, Dialog, DialogTitle, DialogContent,
    DialogActions, Select, MenuItem, FormControl, Table, TableBody,
    TableCell, TableHead, TableRow, Checkbox, FormControlLabel, Chip, IconButton,
    Container, TableContainer, CircularProgress, InputAdornment, Divider,
    Paper, Stack, Tooltip, Menu, Tabs, Tab
} from '@mui/material';
import {
    Plus, Key, Trash2, Edit2, Monitor, X,
    Search, CheckCircle, User, RotateCcw, Filter, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router';
import { supabase } from '../../lib/supabaseClient';
import { BAHAD_GROUP_KEY_ID } from 'lib/consts';
import { ro } from 'date-fns/locale';

const ROOM_TYPE_THEMES = {
    'צוותי': { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    'פלוגתי': { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    'דו״צ': { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
    'אולם': { color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
    'הדב״מים': { color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
    'default': { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' }
};

const STATS_ORDER = ['צוותי', 'דו״צ', 'פלוגתי', 'הדב״מים', 'אולם'];
const KAHAD_BAHADI_GROUP_ID = 1; // ID של קה"ד בה"די

const KeysManager = () => {
    const { user, isDark } = useOutletContext();

    const [keys, setKeys] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [groups, setGroups] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]);
    const [keyAssignments, setKeyAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTypeId, setSelectedTypeId] = useState(null);
    const [tabValue, setTabValue] = useState(0); // כרטיסייה נבחרת

    // פילטר שבועי
    const [selectedWednesday, setSelectedWednesday] = useState('');
    const [wednesdayOffset, setWednesdayOffset] = useState(0);

    const [statusFilterAnchor, setStatusFilterAnchor] = useState(null);
    const [statusFilterValue, setStatusFilterValue] = useState('all');

    const [showModal, setShowModal] = useState(false);
    const [editingKey, setEditingKey] = useState(null);
    const [formData, setFormData] = useState({ room_number: '', room_type_id: '', has_computers: false, building_id: '' });

    const THEME_COLOR = '#10b981';

    const isAdmin = user?.roles?.some(role => ['מנהל'].includes(role)) || user?.roles?.some(role => ['קה״ד בה״די'].includes(role));

    // בדיקה אם המשתמש הוא קה"ד בה"די או מנהל
    const isKahadBahadi = user?.group_id === KAHAD_BAHADI_GROUP_ID;
    const canManageAll = isAdmin || isKahadBahadi;

    // מציאת הגדוד של המשתמש (traverse up to group_type_id === 2)
    const userBattalion = useMemo(() => {
        if (!user?.group_id || !groups.length) return null;
        let current = groups.find(g => g.id === user.group_id);
        while (current && current.group_type_id !== 2 && current.parent_id) {
            current = groups.find(g => g.id === current.parent_id);
        }
        return current && current.group_type_id === 2 ? current : null;
    }, [user, groups]);

    const battalions = useMemo(() =>
        groups.filter(g => g.group_type_id === 2).sort((a, b) => a.name.localeCompare(b.name)),
        [groups]);

    // חישוב יום רביעי
    const getNextWednesday = (weeks) => {
        const d = new Date();
        // d.setDate(d.getDate() + (14 + (weeks * 7)));
        // d.setDate(d.getDate() + (3 - d.getDay() + 7) % 7 || 7);
        const dayOfWeek = d.getDay();
    // מחשבים כמה ימים עברו מאז יום רביעי האחרון
    const daysSinceWednesday = (dayOfWeek + 4) % 7;
    d.setDate(d.getDate() - daysSinceWednesday + (weeks * 7));
    return d;
    };

    useEffect(() => {
        const targetWednesday = getNextWednesday(wednesdayOffset);
        setSelectedWednesday(targetWednesday.toISOString().split('T')[0]);
    }, [wednesdayOffset]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [keysReq, buildingsReq, groupsReq, roomTypesReq] = await Promise.all([
                supabase.from('keysmanager_keys').select('*').order('room_number', { ascending: true }),
                supabase.from("buildings").select("*"),
                supabase.from("group_node").select("*"),
                supabase.from("room_type").select("*")
            ]);

            if (keysReq.data) setKeys(keysReq.data);
            if (buildingsReq.data) setBuildings(buildingsReq.data);
            if (groupsReq.data) setGroups(groupsReq.data);
            if (roomTypesReq.data) setRoomTypes(roomTypesReq.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // שליפת שיוכי מפתחות לשבוע הנבחר
    const fetchKeyAssignments = useCallback(async () => {
        if (!selectedWednesday) return;

        try {
            const { data, error } = await supabase
                .from('key_assignments')
                .select(`
                    *,
                    request:keys_request!inner(
                        id,
                        requestee:requestee(id, name)
                    )
                `)
                .eq('assigned_at', selectedWednesday);

            if (!error && data) {
                setKeyAssignments(data);
            }
        } catch (e) {
            console.error('Error fetching key assignments:', e);
        }
    }, [selectedWednesday]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchKeyAssignments();
    }, [fetchKeyAssignments]);

    useEffect(() => {
        const channel = supabase
            .channel('keys-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'keysmanager_keys' }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'key_assignments' }, () => {
                fetchKeyAssignments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData, fetchKeyAssignments]);

    const handleSaveKey = async () => {
        const payload = { ...formData };
        const { error } = editingKey
            ? await supabase.from('keysmanager_keys').update(payload).eq('id', editingKey.id)
            : await supabase.from('keysmanager_keys').insert([{ ...payload, assigned_group_id: BAHAD_GROUP_KEY_ID, status: 'available' }]);

        if (!error) { fetchData(); setShowModal(false); }
    };

    // שינוי שיוך ידני
    const handleManualAssignment = async (keyId, newBattalionId) => {
        try {
            // מציאת השיוך הקיים
            const existingAssignment = keyAssignments.find(a => a.key_id === keyId);

            if (newBattalionId === 'available') {
                // הסרת השיוך - מחיקה מ-key_assignments
                if (existingAssignment) {
                    await supabase
                        .from('key_assignments')
                        .delete()
                        .eq('id', existingAssignment.id);
                }
            } else {
                // מציאת או יצירת בקשה לגדוד החדש
                const { data: existingRequest } = await supabase
                    .from('keys_request')
                    .select('id')
                    .eq('requestee', newBattalionId)
                    .eq('range_start', selectedWednesday)
                    .single();

                let requestId = existingRequest?.id;

                // אם אין בקשה, ניצור אחת
                if (!requestId) {
                    const { data: newRequest, error: createError } = await supabase
                        .from('keys_request')
                        .insert({
                            requestee: newBattalionId,
                            range_start: selectedWednesday,
                            status: 'approved',
                            single_team_amount: 0,
                            two_team_amount: 0,
                            company_amount: 0,
                            assigned_small_rooms: 0,
                            assigned_dotz_rooms: 0,
                            assigned_large_rooms: 0,
                            missing_rooms: 0
                        })
                        .select('id')
                        .single();

                    if (createError) {
                        console.error('Error creating request:', createError);
                        return;
                    }
                    requestId = newRequest.id;
                }

                if (existingAssignment) {
                    // עדכון השיוך הקיים
                    await supabase
                        .from('key_assignments')
                        .update({ request_id: requestId })
                        .eq('id', existingAssignment.id);
                } else {
                    // יצירת שיוך חדש
                    await supabase
                        .from('key_assignments')
                        .insert({
                            key_id: keyId,
                            request_id: requestId,
                            assigned_at: selectedWednesday
                        });
                }
            }

            fetchKeyAssignments();
        } catch (error) {
            console.error('Error in manual assignment:', error);
        }
    };

    const getTheme = (typeName) => ROOM_TYPE_THEMES[typeName] || ROOM_TYPE_THEMES.default;

    // יצירת מפה: key_id -> battalion_id מהשיוכים של השבוע
    const weekKeyAssignments = useMemo(() => {
        const assignments = {};

        keyAssignments.forEach(assignment => {
            if (assignment.request?.requestee?.id) {
                assignments[assignment.key_id] = assignment.request.requestee.id;
            }
        });

        return assignments;
    }, [keyAssignments]);

    // ספירת בקשות מאושרות לשבוע
    const approvedRequestsCount = useMemo(() => {
        const uniqueRequests = new Set(keyAssignments.map(a => a.request_id));
        return uniqueRequests.size;
    }, [keyAssignments]);

    // סינון מפתחות לפי כרטיסייה
    const filteredKeysByTab = useMemo(() => {
        if (canManageAll) {
            // מנהלים וקה"ד רואים הכל
            return keys;
        }

        if (tabValue === 0) {
            // כרטיסייה ראשונה - המפתחות של הגדוד שלי
            return keys.filter(k => {
                const assignedBattalion = weekKeyAssignments[k.id];
                return assignedBattalion === userBattalion?.id;
            });
        } else {
            // כרטיסייה שנייה - כל שאר המפתחות
            return keys.filter(k => {
                const assignedBattalion = weekKeyAssignments[k.id];
                return assignedBattalion !== userBattalion?.id;
            });
        }
    }, [canManageAll, tabValue, keys, weekKeyAssignments, userBattalion]);

    const processedKeys = useMemo(() => {
        return filteredKeysByTab.filter(k => {
            const matchesSearch = k.room_number.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = selectedTypeId ? k.room_type_id === selectedTypeId : true;

            // השיוך בשבוע הנבחר מתוך key_assignments
            const assignedGroupIdInWeek = weekKeyAssignments[k.id];

            let matchesStatus = true;
            if (statusFilterValue === 'available') {
                matchesStatus = !assignedGroupIdInWeek;
            } else if (statusFilterValue !== 'all') {
                matchesStatus = assignedGroupIdInWeek === statusFilterValue;
            }

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [filteredKeysByTab, searchQuery, selectedTypeId, statusFilterValue, weekKeyAssignments]);

    const stats = useMemo(() => {
        return roomTypes
            .sort((a, b) => STATS_ORDER.indexOf(a.name) - STATS_ORDER.indexOf(b.name))
            .map(type => ({
                ...type,
                count: processedKeys.filter(k => k.room_type_id === type.id).length,
                theme: getTheme(type.name)
            }));
    }, [roomTypes, processedKeys]);

    if (isLoading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress color="success" />
        </Box>
    );

    return (
        <Container maxWidth="lg" sx={{ py: 6 }} dir="rtl">
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ bgcolor: '#10b98115', p: 1.5, borderRadius: '16px' }}>
                        <Key size={32} color="#10b981" />
                    </Box>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>ניהול מפתחות</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {canManageAll ? 'מעקב שיוך כיתות לגדודים וסטטוס זמינות' : `מעקב מפתחות - גדוד ${userBattalion?.name || ''}`}
                        </Typography>
                    </Box>
                </Box>
                {canManageAll && (
                    <Button
                        variant="contained" startIcon={<Plus size={20} />}
                        onClick={() => { setEditingKey(null); setFormData({ room_number: '', room_type_id: '', has_computers: false, building_id: '' }); setShowModal(true); }}
                        sx={{ bgcolor: '#10b981', borderRadius: '14px', px: 3, py: 1.2, fontWeight: 700, '&:hover': { bgcolor: '#059669' } }}
                    >
                        הוסף מפתח
                    </Button>
                )}
            </Box>

            {/* Tabs - רק למשתמשים רגילים */}
            {!canManageAll && (
                <Box sx={{ mb: 3 }}>
                    <Tabs
                        value={tabValue}
                        onChange={(e, newValue) => setTabValue(newValue)}
                        sx={{
                            '& .MuiTab-root': { fontWeight: 700, fontSize: '1rem' },
                            '& .Mui-selected': { color: THEME_COLOR }
                        }}
                    >
                        <Tab label={`המפתחות שלי (גדוד ${userBattalion?.name || ''})`} />
                        <Tab label="כל שאר המפתחות" />
                    </Tabs>
                </Box>
            )}

            {/* Week Navigator */}
            <Box sx={{ position: 'relative', width: '100%', maxWidth: 500, mb: 4, mx: 'auto' }}>
                <Paper elevation={0} sx={{ p: 1.5, borderRadius: '24px', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', border: '1px solid', borderColor: THEME_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <IconButton onClick={() => wednesdayOffset > 0 && setWednesdayOffset(prev => prev - 1)} disabled={wednesdayOffset === 0}>
                        <ChevronRight size={28} />
                    </IconButton>
                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: THEME_COLOR, display: 'block', mb: 0.5 }}>יום רביעי</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {selectedWednesday && new Date(selectedWednesday).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Typography>
                    </Box>
                    <IconButton onClick={() => setWednesdayOffset(prev => prev + 1)} sx={{ color: THEME_COLOR, bgcolor: `${THEME_COLOR}10` }}>
                        <ChevronLeft size={28} />
                    </IconButton>
                </Paper>
                <AnimatePresence>
                    {wednesdayOffset > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            style={{ position: 'absolute', bottom: -35, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}
                        >
                            <Button
                                size="small"
                                startIcon={<RotateCcw size={14} />}
                                onClick={() => setWednesdayOffset(0)}
                                sx={{ color: THEME_COLOR, fontWeight: 800, fontSize: '0.85rem' }}
                            >
                                חזור לרביעי הנוכחי
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>



            {/* Stats Cards */}
            <Box sx={{ display: 'flex', gap: 2, mb: 4, overflowX: 'auto', pb: 1 }}>
                <Card
                    onClick={() => setSelectedTypeId(null)}
                    sx={{
                        flex: 1, minWidth: '140px', p: 2, cursor: 'pointer', borderRadius: '20px',
                        border: '2px solid', borderColor: !selectedTypeId ? '#10b981' : 'transparent',
                        bgcolor: isDark ? '#1e293b' : '#fff', transition: '0.2s',
                        '&:hover': { transform: 'translateY(-4px)' }
                    }}
                >
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 800 }}>סה״כ מפתחות</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>{processedKeys.length}</Typography>
                </Card>
                {stats.map(type => (
                    <Card
                        key={type.id} onClick={() => setSelectedTypeId(type.id === selectedTypeId ? null : type.id)}
                        sx={{
                            flex: 1, minWidth: '140px', p: 2, cursor: 'pointer', borderRadius: '20px',
                            border: '2px solid', borderColor: selectedTypeId === type.id ? type.theme.color : 'transparent',
                            bgcolor: isDark ? `${type.theme.color}10` : type.theme.bg, transition: '0.2s',
                            '&:hover': { transform: 'translateY(-4px)' }
                        }}
                    >
                        <Typography variant="caption" sx={{ color: type.theme.color, fontWeight: 800 }}>{type.name}</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: type.theme.color }}>{type.count}</Typography>
                    </Card>
                ))}
            </Box>

            {/* Search */}
            <Box sx={{ display: 'flex', mb: 3, gap: 2, alignItems: 'center' }}>
                <TextField
                    size="small" placeholder="חיפוש לפי מספר חדר..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search size={18} color="#94a3b8" /></InputAdornment>,
                        sx: { borderRadius: '14px', bgcolor: isDark ? '#1e293b' : '#fff' }
                    }}
                    sx={{ width: 350 }}
                />
            </Box>

            {/* Table */}
            <TableContainer component={Paper} sx={{ borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: isDark ? '#334155' : '#f8fafc' }}>
                        <TableRow>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>חדר</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>סוג</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>בניין</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>מחשבים</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 800 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                                    שיוך גדודי
                                    {canManageAll && (
                                        <IconButton size="small" onClick={(e) => setStatusFilterAnchor(e.currentTarget)}>
                                            <Filter size={16} color={statusFilterValue !== 'all' ? '#10b981' : '#64748b'} strokeWidth={2.5} />
                                        </IconButton>
                                    )}
                                </Box>
                                {canManageAll && (
                                    <Menu
                                        anchorEl={statusFilterAnchor}
                                        open={Boolean(statusFilterAnchor)}
                                        onClose={() => setStatusFilterAnchor(null)}
                                        dir="rtl"
                                        PaperProps={{ sx: { borderRadius: '16px', mt: 1.5, minWidth: 180 } }}
                                    >
                                        <MenuItem onClick={() => { setStatusFilterValue('all'); setStatusFilterAnchor(null); }} sx={{ justifyContent: 'flex-start' }}>הצג הכל</MenuItem>
                                        <MenuItem onClick={() => { setStatusFilterValue('available'); setStatusFilterAnchor(null); }} sx={{ justifyContent: 'flex-start', color: '#10b981', fontWeight: 700 }}>🔓 פנוי בלבד</MenuItem>
                                        <Divider />
                                        {battalions.map(b => (
                                            <MenuItem key={b.id} onClick={() => { setStatusFilterValue(b.id); setStatusFilterAnchor(null); }} sx={{ justifyContent: 'flex-start' }}>גדוד {b.name}</MenuItem>
                                        ))}
                                    </Menu>
                                )}
                            </TableCell>
                            {canManageAll && <TableCell align="center" sx={{ fontWeight: 800 }}>פעולות</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {processedKeys.map((key) => {
                            const typeName = roomTypes.find(t => t.id === key.room_type_id)?.name;
                            const theme = getTheme(typeName);

                            // השיוך בשבוע הנבחר מתוך key_assignments
                            const assignedGroupIdInWeek = weekKeyAssignments[key.id];
                            const assignedGroup = groups.find(g => g.id === assignedGroupIdInWeek);
                            const isFree = !assignedGroupIdInWeek;

                            return (
                                <TableRow key={key.id} hover>
                                    <TableCell align="center" sx={{ fontWeight: 900, fontSize: '1.1rem' }}>{key.room_number}</TableCell>
                                    <TableCell align="center">
                                        <Chip label={typeName} size="small" sx={{ bgcolor: theme.bg, color: theme.color, fontWeight: 800, border: `1px solid ${theme.border}` }} />
                                    </TableCell>
                                    <TableCell align="center">{buildings.find(b => b.id === key.building_id)?.name || '-'}</TableCell>
                                    <TableCell align="center">{key.has_computers ? <Monitor size={18} color="#3b82f6" /> : '-'}</TableCell>

                                    <TableCell align="center">
                                        {canManageAll ? (
                                            // מנהל/קה"ד - יכול לשנות שיוך
                                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                                <Select
                                                    value={isFree ? 'available' : assignedGroupIdInWeek}
                                                    onChange={(e) => handleManualAssignment(key.id, e.target.value)}
                                                    sx={{
                                                        borderRadius: '10px',
                                                        fontWeight: 700,
                                                        height: 34,
                                                        bgcolor: isFree ? 'transparent' : '#fff7ed',
                                                        color: isFree ? 'inherit' : '#ea580c',
                                                        '.MuiOutlinedInput-notchedOutline': { borderColor: isFree ? 'rgba(0,0,0,0.23)' : '#fed7aa' }
                                                    }}
                                                    MenuProps={{ dir: 'rtl' }}
                                                >
                                                    <MenuItem value="available" sx={{ color: '#10b981', fontWeight: 700, justifyContent: 'flex-start' }}>🔓 פנוי</MenuItem>
                                                    <Divider />
                                                    {battalions.map(b => (
                                                        <MenuItem key={b.id} value={b.id} sx={{ justifyContent: 'flex-start' }}>גדוד {b.name}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        ) : (
                                            // משתמש רגיל - רק צפייה
                                            isFree ? (
                                                <Chip label="פנוי" size="small" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                                            ) : (
                                                <Chip
                                                    label={`גדוד ${assignedGroup?.name}`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: '#fff7ed',
                                                        color: '#ea580c',
                                                        fontWeight: 700,
                                                        border: '1px solid #fed7aa'
                                                    }}
                                                />
                                            )
                                        )}
                                    </TableCell>

                                    {canManageAll && (
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                <IconButton onClick={() => { setEditingKey(key); setFormData(key); setShowModal(true); }} size="small" color="primary"><Edit2 size={18} /></IconButton>
                                                <IconButton size="small" color="error" onClick={() => { if (window.confirm('למחוק את המפתח מהמערכת?')) supabase.from('keysmanager_keys').delete().eq('id', key.id).then(() => fetchData()); }}><Trash2 size={18} /></IconButton>
                                            </Stack>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Modal: Add/Edit Key */}
            {canManageAll && (
                <Dialog
                    open={showModal} onClose={() => setShowModal(false)} dir="rtl" fullWidth maxWidth="xs"
                    PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
                >
                    <IconButton onClick={() => setShowModal(false)} size="small" sx={{ position: 'absolute', left: 16, top: 16, color: '#94a3b8' }}><X size={20} /></IconButton>
                    <DialogTitle sx={{ pt: 4, pb: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ bgcolor: '#f0fdf4', p: 1.5, borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                                <Key size={24} color="#22c55e" />
                            </Box>
                            <Box><Typography variant="h5" sx={{ fontWeight: 800 }}>{editingKey ? 'ערוך מפתח' : 'הוסף מפתח חדש'}</Typography></Box>
                        </Stack>
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ mt: 2 }}>
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>מספר חדר *</Typography>
                                <TextField fullWidth size="medium" placeholder="למשל, 101..." value={formData.room_number} onChange={e => setFormData({ ...formData, room_number: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>סוג חדר *</Typography>
                                <FormControl fullWidth>
                                    <Select value={formData.room_type_id} onChange={e => setFormData({ ...formData, room_type_id: e.target.value })} sx={{ borderRadius: '12px' }} displayEmpty MenuProps={{ dir: 'rtl' }}>
                                        <MenuItem value="" disabled>בחר סוג חדר...</MenuItem>
                                        {roomTypes.map(t => <MenuItem key={t.id} value={t.id} sx={{ justifyContent: 'flex-start' }}>{t.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>אזור *</Typography>
                                <FormControl fullWidth>
                                    <Select value={formData.building_id} onChange={e => setFormData({ ...formData, building_id: e.target.value })} sx={{ borderRadius: '12px' }} displayEmpty MenuProps={{ dir: 'rtl' }}>
                                        <MenuItem value="" disabled>בחר אזור...</MenuItem>
                                        {buildings.map(b => <MenuItem key={b.id} value={b.id} sx={{ justifyContent: 'flex-start' }}>{b.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <FormControlLabel dir="ltr" sx={{ justifyContent: 'flex-end', mr: 0, '& .MuiTypography-root': { fontWeight: 700, fontSize: '0.9rem' } }}
                                    control={<Checkbox checked={formData.has_computers} onChange={e => setFormData({ ...formData, has_computers: e.target.checked })} sx={{ '&.Mui-checked': { color: '#10b981' } }} />}
                                    label="💻 יש מחשב בכיתה" labelPlacement="end"
                                />
                            </Box>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 3, gap: 2 }}>
                        <Button fullWidth variant="contained" onClick={handleSaveKey} disabled={!formData.room_number || !formData.room_type_id || !formData.building_id} sx={{ borderRadius: '12px', py: 1.5, fontWeight: 800, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}>{editingKey ? 'עדכן מפתח' : 'הוסף מפתח'}</Button>
                        <Button fullWidth variant="outlined" onClick={() => setShowModal(false)} sx={{ borderRadius: '12px', py: 1.5, fontWeight: 700, color: '#1e293b', borderColor: '#e2e8f0' }}>ביטול</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Container>
    );
};

export default KeysManager;