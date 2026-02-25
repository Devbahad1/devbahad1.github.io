import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
    Button,
    TextField,
    Paper,
    Stack,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    IconButton,
} from '@mui/material';
import {
    VpnKey as KeyIcon,
    Key as KeySvgIcon,
    LaptopMac as ComputerIcon,
    AccessTime as ClockIcon,
    ArrowForward as ArrowForwardIcon,
    FilterList as FilterIcon,
    GroupOutlined as GroupIcon,
    PersonOutline as PersonIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useOutletContext } from 'react-router';
import { supabase } from '../../lib/supabaseClient';
import { Monitor } from 'lucide-react';

const StatCard = ({ label, value, total, icon, iconBg, iconColor, cornerBg }) => (
    <Paper
        elevation={0}
        sx={{
            width: '100%',
            minWidth: 0,
            position: 'relative',
            overflow: 'hidden',
            height: 112,
            px: 3,
            py: 2.5,
            borderRadius: '26px',
            border: '1px solid #e8eef6',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexDirection: 'row-reverse',
            bgcolor: '#ffffff',
            boxSizing: 'border-box',
        }}
    >
        <Box
            sx={{
                position: 'absolute',
                top: -70,
                right: -70,
                width: 190,
                height: 190,
                borderRadius: '50%',
                bgcolor: cornerBg,
            }}
        />

        <Box
            sx={{
                width: 62,
                height: 62,
                borderRadius: '18px',
                bgcolor: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                flex: '0 0 auto',
            }}
        >
            {React.cloneElement(icon, { sx: { color: iconColor, fontSize: 32 } })}
        </Box>

        <Box sx={{ textAlign: 'right', zIndex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#64748b', mb: 1 }}>
                {label}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, justifyContent: 'flex-end' }}>
                <Typography sx={{ fontSize: 44, lineHeight: 1, fontWeight: 900, color: '#0f172a' }}>
                    {value}
                </Typography>

                {total != null && (
                    <Typography component="span" sx={{ fontSize: 18, fontWeight: 800, color: '#94a3b8' }}>
                        /{total}
                    </Typography>
                )}
            </Box>
        </Box>
    </Paper>
);

function hhmmNow() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

const KeyCard = ({
    keyItem,
    busy,
    hasComputers,
    roomTypeLabel,
    usageWindow,
    onCheckoutClick,
}) => {
    const status = busy ? 'תפוס' : 'זמין';

    const cardStyles = busy
        ? {
            border: '2px solid #fde68a',
            background: 'linear-gradient(135deg, rgba(255, 251, 235, 0.9), #ffffff)',
            badgeBg: '#f59e0b',
            badgeHover: '#d97706',
            iconBoxBg: '#ffedd5',
            iconColor: '#b45309',

        }
        : {
            border: '2px solid #a7f3d0',
            background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.9), #ffffff)',
            badgeBg: '#10b981',
            badgeHover: '#059669',
            iconBoxBg: '#d1fae5',
            iconColor: '#047857',
        };

    const isPluga = roomTypeLabel === 'פלוגתי';
    const roomTypeStyles = isPluga
        ? { borderColor: '#d8b4fe', color: '#6b21a8', bgcolor: '#faf5ff', emoji: '🏢' }
        : { borderColor: '#93c5fd', color: '#1d4ed8', bgcolor: '#eff6ff', emoji: '🏠' };

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: '24px',
                border: cardStyles.border,
                background: cardStyles.background,
                transition: 'all 250ms ease',
                '&:hover': { boxShadow: '0 14px 40px rgba(15, 23, 42, 0.10)' },
                overflow: 'hidden',
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    sx={{ mb: 2 }}
                >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box
                            sx={{
                                p: 1.4,
                                borderRadius: '12px',
                                bgcolor: cardStyles.iconBoxBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flex: '0 0 auto',
                                height: 26,
                            }}
                        >
                            <KeySvgIcon sx={{ fontSize: 20, color: cardStyles.iconColor }} />
                        </Box>

                        <Box sx={{ textAlign: 'right' }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 600,
                                    color: '#0f172a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.3,
                                    justifyContent: 'flex-end',
                                    fontSize: 19,
                                }}
                            >
                                חדר {keyItem.room_number}
                                {hasComputers && <Monitor size={18} color="#3b82f6" />}
                            </Typography>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <Chip
                                    variant="outlined"
                                    size="small"
                                    label={`${roomTypeStyles.emoji} ${roomTypeLabel === 'פלוגתי' ? 'פלוגתי' : 'צוותי'}`}
                                    sx={{
                                        mt: 0.35,
                                        borderRadius: '7px',
                                        borderColor: roomTypeStyles.borderColor,
                                        color: roomTypeStyles.color,
                                        bgcolor: roomTypeStyles.bgcolor,
                                        fontWeight: 900,
                                    }}
                                />
                            </Box>
                        </Box>
                    </Stack>

                    <Chip
                        label={status}
                        size="small"
                        sx={{
                            bgcolor: cardStyles.badgeBg,
                            color: '#fff',
                            fontWeight: 900,
                            borderRadius: '10px',
                            px: 0.5,
                            '&:hover': { bgcolor: cardStyles.badgeHover },
                        }}
                    />
                </Stack>

                {busy && usageWindow && (
                    <Box
                        sx={{
                            mb: 2,
                            p: 1.5,
                            borderRadius: '14px',
                            border: '1px solid rgba(15, 23, 42, 0.06)',
                            bgcolor: 'rgba(255,255,255,0.78)',
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#475569', mb: 0.5 }}>
                            <PersonIcon sx={{ fontSize: 18 }} />
                            <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                                תפוס בחלון שבחרת
                            </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: '#94a3b8' }}>
                            <ClockIcon sx={{ fontSize: 16 }} />
                            <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
                                {usageWindow.start_time} - {usageWindow.end_time}
                            </Typography>
                        </Stack>
                    </Box>
                )}

                <Button
                    fullWidth
                    variant="contained"
                    disabled={busy}
                    onClick={onCheckoutClick}
                    sx={{
                        borderRadius: '14px',
                        py: 1.5,
                        fontWeight: 950,
                        boxShadow: 'none',
                        bgcolor: busy ? '#e2e8f0' : '#059669',
                        color: busy ? '#94a3b8' : '#fff',
                        '&:hover': { bgcolor: busy ? '#e2e8f0' : '#047857' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                    }}
                >
                    משוך מפתח
                    <ArrowForwardIcon sx={{ fontSize: 20, ml: 0.5 }} />
                </Button>
            </CardContent>
        </Card>
    );
};

export default function DashboardPage() {
    const { user, isDark } = useOutletContext();

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [filterType, setFilterType] = useState('הכל');

    const [keys, setKeys] = useState([]);
    const [usages, setUsages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userGdudId, setUserGdudId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const [checkoutKey, setCheckoutKey] = useState(null);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [checkoutStartTime, setCheckoutStartTime] = useState('09:00');
    const [checkoutEndTime, setCheckoutEndTime] = useState('08:00');

    // רשימת הצוותים שתחת המשתמש
    const [userTeams, setUserTeams] = useState([]);

    useEffect(() => {
        const init = async () => {
            if (user?.group_id) {
                const adminStatus = await checkIfAdmin(user.id);
                setIsAdmin(adminStatus);

                const gdudId = await findUserGdud(user.group_id);
                setUserGdudId(gdudId);

                // טעינת הצוותים
                await loadUserTeams(gdudId, adminStatus);

                fetchDashboardData(gdudId, adminStatus);
            }
        };
        init();
    }, [user, selectedDate]);

    const checkIfAdmin = async (userId) => {
        const { data } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        return data?.role === 'admin' || data?.role === 'manager';
    };

    const loadUserTeams = async (gdudId, adminStatus) => {
        if (adminStatus) {
            // מנהל - טען את כל הפלוגות והצוותים
            const { data: allGroups } = await supabase
                .from('group_node')
                .select('id, name, group_type_id, parent_id')
                .in('group_type_id', [2, 3]) // גדוד ופלוגה
                .order('name');

            setUserTeams(allGroups || []);
        } else {
            // משתמש רגיל - טען את הפלוגה שלו + הצוותים תחתיה
            const { data: pluga } = await supabase
                .from('group_node')
                .select('id, name, group_type_id')
                .eq('id', gdudId)
                .single();

            const { data: squads } = await supabase
                .from('group_node')
                .select('id, name, group_type_id, parent_id')
                .eq('parent_id', gdudId)
                .order('name');

            const teams = [];
            if (pluga) {
                teams.push({ ...pluga, label: `${pluga.name} (כל הפלוגה)` });
            }
            if (squads) {
                squads.forEach(squad => {
                    teams.push({ ...squad, label: squad.name });
                });
            }

            setUserTeams(teams);
        }
    };

    const findUserGdud = async (groupId) => {
        let currentId = groupId;
        while (currentId) {
            const { data } = await supabase
                .from('group_node')
                .select('id, parent_id, group_type_id')
                .eq('id', currentId)
                .single();

            if (!data) break;
            if (data.group_type_id === 2) return data.id;
            currentId = data.parent_id;
        }
        return groupId;
    };

    const fetchDashboardData = async (gdudId, adminStatus) => {
        setLoading(true);
        try {
            const relevantWed = getRelevantWednesday(selectedDate);

            const { data: assignments } = await supabase
                .from('key_assignments')
                .select('key_id')
                .eq('assigned_at', relevantWed);

            const assignedIds = assignments?.map((a) => a.key_id) || [];

            const { data: keysData } = await supabase
                .from('keysmanager_keys')
                .select('*, room_type:room_type_id(name)')
                .in('id', assignedIds);

            const { data: usagesData } = await supabase
                .from('schedule_lessons')
                .select('room_number, start_time, end_time')
                .eq('date', selectedDate);

            setKeys(keysData || []);
            setUsages(usagesData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const isBusy = (roomNum) => {
        if (!startTime || !endTime) return false;
        return usages.some(
            (u) => u.room_number === roomNum && startTime < u.end_time && endTime > u.start_time
        );
    };

    const getBusyWindow = (roomNum) => {
        if (!startTime || !endTime) return null;
        const hit = usages.find(
            (u) => u.room_number === roomNum && startTime < u.end_time && endTime > u.start_time
        );
        return hit ? { start_time: hit.start_time, end_time: hit.end_time } : null;
    };

    const handleCheckout = async () => {
        if (!selectedTeamId) return alert('נא לבחור צוות');
        if (!checkoutEndTime || !checkoutStartTime) return alert('נא לבחור שעות');

        if (checkoutEndTime <= checkoutStartTime) {
            return alert('שעת סיום חייבת להיות אחרי שעת התחלה');
        }

        try {
            const { error } = await supabase.from('schedule_lessons').insert([
                {
                    date: selectedDate,
                    start_time: checkoutStartTime,
                    end_time: checkoutEndTime,
                    room_number: checkoutKey.room_number,
                    status: 2,
                    group_node_id: selectedTeamId, // שומר את הצוות שנבחר
                    team_id: selectedTeamId,
                },
            ]);

            if (error) throw error;

            setCheckoutKey(null);
            setSelectedTeamId('');
            setCheckoutStartTime('09:00');
            setCheckoutEndTime('08:00');
            fetchDashboardData(userGdudId, isAdmin);
        } catch (e) {
            console.error(e);
            alert('שגיאה במשיכת המפתח');
        }
    };

    const filteredKeys = useMemo(() => {
        return keys.filter((k) => filterType === 'הכל' || k.room_type?.name === filterType);
    }, [keys, filterType]);

    const totalKeys = keys.length;
    const inUseCount = keys.filter((k) => isBusy(k.room_number)).length;
    const availableCount = Math.max(totalKeys - inUseCount, 0);

    // קבלת שם הצוות הנבחר
    const getSelectedTeamName = () => {
        const team = userTeams.find(t => t.id === parseInt(selectedTeamId));
        return team?.label || team?.name || '';
    };

    return (
        <Box
            dir="rtl"
            sx={{
                minHeight: '100vh',
                py: 4,
                overflowX: 'hidden',
                bgcolor: 'transparent',
                boxSizing: 'border-box',
            }}
        >
            <Box
                sx={{
                    maxWidth: '1280px',
                    mx: 'auto',
                    px: { xs: 2, sm: 3, lg: 4 },
                    py: 2,
                    boxSizing: 'border-box',
                    width: '100%',
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 4, gap: 1 }}>
                    <Typography
                        variant="h4"
                        sx={{ fontWeight: 900, color: '#1e293b', textAlign: 'right', direction: 'rtl' }}
                    >
                        ניהול מפתחות
                    </Typography>
                    <Typography variant="h4">🔑</Typography>
                </Box>

                <Box
                    sx={{
                        width: '100%',
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                        gap: 3,
                        mb: 6,
                        boxSizing: 'border-box',
                    }}
                >
                    <StatCard
                        label="זמינים"
                        value={availableCount}
                        total={totalKeys}
                        icon={<KeyIcon />}
                        iconBg="#dcfce7"
                        iconColor="#22c55e"
                        cornerBg="#ecfdf5"
                    />
                    <StatCard
                        label="בשימוש"
                        value={inUseCount}
                        total={totalKeys}
                        icon={<GroupIcon />}
                        iconBg="#fff7ed"
                        iconColor="#f97316"
                        cornerBg="#fff7ed"
                    />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mb: 3, alignItems: 'center' }}>
                    <Typography
                        variant="body2"
                        color="#64748b"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}
                    >
                        סוג חדר: <FilterIcon sx={{ fontSize: 18 }} />
                    </Typography>

                    <Box sx={{ display: 'flex', bgcolor: '#f1f5f9', p: 0.5, borderRadius: '12px' }}>
                        {['הכל', 'צוותי', 'פלוגתי'].map((type) => (
                            <Button
                                key={type}
                                size="small"
                                onClick={() => setFilterType(type)}
                                sx={{
                                    borderRadius: '10px',
                                    px: 3,
                                    fontWeight: 800,
                                    bgcolor: filterType === type ? '#1e293b' : 'transparent',
                                    color: filterType === type ? 'white' : '#64748b',
                                }}
                            >
                                {type === 'צוותי' ? ' צוותי 🏠' : type === 'פלוגתי' ? ' פלוגתי 🏢' : 'הכל'}
                            </Button>
                        ))}
                    </Box>
                </Box>

                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        mb: 4,
                        borderRadius: '16px',
                        border: '1px solid #dbeafe',
                        width: '100%',
                        boxSizing: 'border-box',
                        direction: 'rtl',
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: 3,
                            flexWrap: 'nowrap',
                            overflowX: 'auto',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                            <Typography sx={{ color: '#334155', fontWeight: 600, fontSize: 15 }}>תאריך:</Typography>
                            <TextField
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                size="small"
                                variant="outlined"
                                sx={{
                                    width: 170,
                                    '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#fff' },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                                    '& input': { textAlign: 'center', fontWeight: 600, fontSize: 15 },
                                }}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                            <Typography sx={{ color: '#334155', fontWeight: 600, fontSize: 15 }}>
                                סנן לפי זמינות:
                            </Typography>

                            <TextField
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                size="small"
                                variant="outlined"
                                sx={{
                                    width: 130,
                                    '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#fff' },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                                    '& input': { textAlign: 'center', fontWeight: 800 },
                                }}
                            />

                            <Typography sx={{ color: '#64748b', fontWeight: 700, fontSize: 15 }}>עד</Typography>

                            <TextField
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                size="small"
                                variant="outlined"
                                sx={{
                                    width: 130,
                                    '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#fff' },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                                    '& input': { textAlign: 'center', fontWeight: 800 },
                                }}
                            />
                        </Box>
                    </Box>
                </Paper>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                        gap: 3,
                        width: '100%',
                    }}
                >
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        filteredKeys.map((keyItem) => {
                            const busy = isBusy(keyItem.room_number);
                            const usageWindow = getBusyWindow(keyItem.room_number);
                            const roomTypeLabel = keyItem.room_type?.name === 'פלוגתי' ? 'פלוגתי' : 'צוותי';

                            return (
                                <KeyCard
                                    key={keyItem.id}
                                    keyItem={keyItem}
                                    busy={busy}
                                    hasComputers={!!keyItem.has_computers}
                                    roomTypeLabel={roomTypeLabel}
                                    usageWindow={usageWindow}
                                    onCheckoutClick={() => {
                                        setCheckoutKey(keyItem);
                                        setSelectedTeamId('');
                                    }}
                                />
                            );
                        })
                    )}
                </Box>
            </Box>

            {/* Checkout Dialog */}
            <Dialog
                open={!!checkoutKey}
                onClose={() => {
                    setCheckoutKey(null);
                    setSelectedTeamId('');
                }}
                dir="rtl"
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        bgcolor: '#f8f9fa',
                    }
                }}
            >
                {/* Header */}
                <Box sx={{
                    p: 3,
                    pb: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    position: 'relative'
                }}>
                    <IconButton
                        onClick={() => {
                            setCheckoutKey(null);
                            setSelectedTeamId('');
                        }}
                        sx={{
                            position: 'absolute',
                            top: 16,
                            left: 16,
                            color: '#64748b'
                        }}
                    >
                        <CloseIcon />
                    </IconButton>

                    <Typography sx={{
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        color: '#0f172a',
                        mb: 0.5
                    }}>
                        משוך מפתח
                    </Typography>

                    <Typography sx={{
                        fontSize: '0.95rem',
                        color: '#64748b',
                        fontWeight: 600
                    }}>
                        משיכת מפתח לחדר {checkoutKey?.room_number} ({checkoutKey?.room_type?.name || 'צוותי'})
                    </Typography>
                </Box>

                <DialogContent sx={{ px: 3, pb: 3 }}>
                    <Stack spacing={3}>
                        {/* בחירת צוות */}
                        <Box>
                            <Typography sx={{
                                textAlign: 'right',
                                mb: 1.5,
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                color: '#334155'
                            }}>
                                החדר עבור *
                            </Typography>
                            <FormControl fullWidth>
                                <Select
                                    value={selectedTeamId}
                                    onChange={(e) => setSelectedTeamId(e.target.value)}
                                    displayEmpty
                                    sx={{
                                        borderRadius: '14px',
                                        bgcolor: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            border: 'none'
                                        },
                                        '& .MuiSelect-select': {
                                            textAlign: 'right',
                                            py: 1.75,
                                            color: selectedTeamId ? '#0f172a' : '#94a3b8',
                                            fontWeight: 600
                                        }
                                    }}
                                >
                                    <MenuItem value="" disabled sx={{ justifyContent: 'flex-end', color: '#94a3b8' }}>
                                        בחר פלוגה או צוות...
                                    </MenuItem>
                                    {userTeams.map((team) => (
                                        <MenuItem
                                            key={team.id}
                                            value={team.id}
                                            sx={{ justifyContent: 'flex-end' }}
                                        >
                                            {team.group_type_id === 2 ? '🏢' : '👥'} {team.label || team.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* שם ידני (מוצג לאחר בחירת צוות) */}
                        {selectedTeamId && (
                            <Box>
                                <Typography sx={{
                                    textAlign: 'right',
                                    mb: 1.5,
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: '#94a3b8'
                                }}>
                                    הזן שם ידנית
                                </Typography>
                                <TextField
                                    fullWidth
                                    value={getSelectedTeamName()}
                                    disabled
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '14px',
                                            bgcolor: '#f1f5f9',
                                            border: '1px solid #e2e8f0',
                                            '& fieldset': {
                                                border: 'none'
                                            }
                                        },
                                        '& input': {
                                            textAlign: 'right',
                                            py: 1.75,
                                            fontWeight: 600,
                                            color: '#64748b'
                                        }
                                    }}
                                />
                            </Box>
                        )}

                        <Box sx={{
                            height: '1px',
                            bgcolor: '#e2e8f0',
                            my: 1
                        }} />

                        {/* שעות */}
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 3
                        }}>
                            {/* שעת סיום */}
                            <Box>
                                <Typography sx={{
                                    textAlign: 'right',
                                    mb: 1.5,
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    color: '#334155'
                                }}>
                                    שעת סיום *
                                </Typography>
                                <TextField
                                    type="time"
                                    fullWidth
                                    value={checkoutEndTime}
                                    onChange={(e) => setCheckoutEndTime(e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '14px',
                                            bgcolor: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            '& fieldset': {
                                                border: 'none'
                                            }
                                        },
                                        '& input': {
                                            textAlign: 'center',
                                            py: 1.75,
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            color: '#0f172a'
                                        }
                                    }}
                                    InputProps={{
                                        endAdornment: (
                                            <ClockIcon sx={{ color: '#94a3b8', mr: 1 }} />
                                        )
                                    }}
                                />
                            </Box>

                            {/* שעת התחלה */}
                            <Box>
                                <Typography sx={{
                                    textAlign: 'right',
                                    mb: 1.5,
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    color: '#334155'
                                }}>
                                    שעת התחלה *
                                </Typography>
                                <TextField
                                    type="time"
                                    fullWidth
                                    value={checkoutStartTime}
                                    onChange={(e) => setCheckoutStartTime(e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '14px',
                                            bgcolor: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            '& fieldset': {
                                                border: 'none'
                                            }
                                        },
                                        '& input': {
                                            textAlign: 'center',
                                            py: 1.75,
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            color: '#0f172a'
                                        }
                                    }}
                                    InputProps={{
                                        endAdornment: (
                                            <ClockIcon sx={{ color: '#94a3b8', mr: 1 }} />
                                        )
                                    }}
                                />
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{
                    p: 3,
                    pt: 0,
                    gap: 2,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr'
                }}>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={handleCheckout}
                        sx={{
                            borderRadius: '14px',
                            py: 1.75,
                            bgcolor: '#10b981',
                            color: '#ffffff',
                            fontWeight: 900,
                            fontSize: '1rem',
                            boxShadow: 'none',
                            '&:hover': {
                                bgcolor: '#059669',
                                boxShadow: 'none'
                            }
                        }}
                    >
                        אשר משיכה
                    </Button>

                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => {
                            setCheckoutKey(null);
                            setSelectedTeamId('');
                        }}
                        sx={{
                            borderRadius: '14px',
                            py: 1.75,
                            bgcolor: '#ffffff',
                            color: '#64748b',
                            borderColor: '#e2e8f0',
                            fontWeight: 900,
                            fontSize: '1rem',
                            '&:hover': {
                                bgcolor: '#f8fafc',
                                borderColor: '#cbd5e1'
                            }
                        }}
                    >
                        ביטול
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

const getRelevantWednesday = (dateString) => {
    const d = new Date(dateString);
    const day = d.getDay();
    const diff = d.getDate() - day + (day <= 3 ? -4 : 3);
    const wed = new Date(d.setDate(diff));
    return wed.toISOString().split('T')[0];
};