import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbarExport,
} from "@mui/x-data-grid";
import { useRouter } from "next/router";
import React from "react";
import { GenericErrorAlert } from "src/components/alert";
import { useCalls } from "src/swr-cache/useCalls";
import { CallFilterParams } from "src/types/params";
import { CallFilterQuery } from "src/types/query";
import { kDateFilterItems } from "src/utils/constant";
import {
  calculateCallDuration,
  numberToRupiahString,
  prettyDateTime,
} from "src/utils/helper";
import { kCallMethod } from "src/utils/constant";
import { Call } from "src/types/models";
import { useUserList } from "src/swr-cache/useUserList";
import { useUser } from "src/swr-cache/useUser";

const columnHeaderClassName = "haluka-datagrid--header";
interface formatedCalls extends Call {
  formattedMethod: string;
  formattedStatus: string;
  formattedDuration: string;
}

const formatCalls = (calls: Call[] | undefined): formatedCalls[] => {
  if (!calls || calls.length === 0) {
    return [];
  }

  return calls.map((call) => {
    return {
      ...call,
      callNumber: `'${call.callNumber}`,
      formattedMethod: kCallMethod[call.method - 1],
      formattedStatus: call.status > 2 ? "Lunas" : "Belum dibayar",
      formattedDuration: calculateCallDuration(call.duration ?? 0),
      total: call.total ?? 0,
    };
  });
};

const columns: GridColDef[] = [
  {
    field: "createdAt",
    headerName: "Waktu",
    flex: 1,
    headerClassName: columnHeaderClassName,
    renderCell: (params: GridRenderCellParams<Date>) => {
      const date = prettyDateTime(params.value ?? new Date());
      return date;
    },
  },
  {
    field: "billNumber",
    headerClassName: columnHeaderClassName,
    headerName: "No Nota",
    width: 100,
  },
  {
    field: "boothNumber",
    headerClassName: columnHeaderClassName,
    headerName: "No KBU",
    width: 100,
  },
  {
    field: "callNumber",
    headerName: "No Tujuan",
    flex: 1,
    headerClassName: columnHeaderClassName,
    renderCell: (params: GridRenderCellParams<string>) => {
      // remove ' character from callNumber
      const parsedCallNumber = params.value
        ? params.value.replace(/'/g, "")
        : "";
      return parsedCallNumber;
    },
  },
  {
    field: "formattedMethod",
    headerName: "Metode Panggilan",
    minWidth: 150,
    headerClassName: columnHeaderClassName,
  },
  {
    field: "formattedStatus",
    headerName: "Status Pembayaran",
    width: 150,
    headerClassName: columnHeaderClassName,
  },
  {
    field: "formattedDuration",
    headerName: "Durasi",
    minWidth: 100,
    headerClassName: columnHeaderClassName,
  },
  {
    field: "total",
    headerName: "Biaya",
    headerClassName: columnHeaderClassName,
    width: 150,

    renderCell: (params: GridRenderCellParams<number>) =>
      numberToRupiahString(params.value ?? 0),
  },
];

const queryToParams = ({
  startDate,
  endDate,
  dateRange,
  status,
  method,
  boothNumber,
  wartelId,
}: CallFilterQuery) => {
  const parsedDateRange = parseInt(dateRange ?? "0");

  // newEndDate is endDate + 1 day
  const endDatePlusOneDay = new Date(
    new Date(endDate ?? 0).getTime() + 86400000
  ).toISOString();

  const { startedAt, endedAt } =
    parsedDateRange === -1
      ? { startedAt: startDate, endedAt: endDatePlusOneDay }
      : {
          startedAt: kDateFilterItems[parsedDateRange].startedAt.toISOString(),
          endedAt: kDateFilterItems[parsedDateRange].endedAt.toISOString(),
        };
  let parsedStatus = undefined;

  // Add 1 to status if 2 exist to ensure all unpaid calls are included (1: open, 2: closed, 3: paid)
  if (status) {
    parsedStatus = [status].flat().includes("2")
      ? [status, "1"].flat()
      : [status].flat();
  }

  const newCallFilterParams: CallFilterParams = {
    startedAt,
    endedAt,
    status: parsedStatus,
    method: method ? [method].flat() : undefined,
    boothNumber: boothNumber ? [boothNumber].flat() : undefined,
    userId: wartelId,
  };

  return newCallFilterParams;
};

export const CallHistoryDataGrid: React.FC = ({}) => {
  // Get current user
  const { user: currentUser } = useUser();
  const { users } = useUserList();
  const [wartelName, setWartelName] = React.useState("wartel");

  // Call Controller
  const { query } = useRouter();
  const { calls, loading, error } = useCalls(queryToParams(query));
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 2) {
        return setWartelName(currentUser.name);
      }

      if (users && query.wartelId) {
        const currentWartel = users.find((user) => user.id === query.wartelId);
        return setWartelName(currentWartel?.name ?? wartelName);
      }
    }
  }, [currentUser, users, query.wartelId]);

  if (error) {
    return <GenericErrorAlert />;
  }

  const toolbarHeight = 44;
  const offset = 24 + toolbarHeight;

  // Create variable to determine the data showed for example "showing 1-10 of 100"
  const total = calls?.length ?? 0;
  const start = page * pageSize + 1;
  const end = Math.min(start + pageSize - 1, total);

  return (
    <Box mt={`${offset + 24}px`}>
      <DataGrid
        autoHeight
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        disableColumnMenu
        onPageSizeChange={setPageSize}
        rowsPerPageOptions={[10, 20, 50]}
        componentsProps={{
          pagination: {
            labelRowsPerPage: "Baris per halaman",
            labelDisplayedRows: ({
              from,
              to,
              count,
            }: {
              from: number;
              to: number;
              count: number;
            }) => `${from}-${to} dari ${count}`,
          },
        }}
        localeText={{
          toolbarExport: "Unduh riwayat panggilan",
          noRowsLabel: "Tidak ada data",
          toolbarExportCSV: "Unduh CSV",
          footerRowSelected: (count) => `${count} baris terpilih`,
        }}
        sx={{
          mb: 6,
          ".haluka-datagrid--header": {
            bgcolor: "secondary.light",
          },
        }}
        components={{
          LoadingOverlay: () => <LinearProgress />,
          // NoRowsOverlay: () => <DataGridNoRowsOverlay />,
          Toolbar: (props) => (
            <Box
              sx={{
                position: "relative",
                width: "100%",
              }}
            >
              <Stack
                className="toolbarContainer"
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                width="100%"
                sx={{
                  position: "absolute",
                  top: `-${offset}px`,
                  width: "100%",
                }}
              >
                <Typography variant="body-md">
                  Menampilkan{" "}
                  {total > 0 ? `${start}-${end} dari total ${total}` : "0"}{" "}
                  riwayat panggilan
                </Typography>
                <GridToolbarExport
                  color="primary"
                  variant="contained"
                  disableElevation
                  sx={{
                    textTransform: "none",
                    borderRadius: "100px",
                    padding: "10px 24px 10px 16px",
                  }}
                  csvOptions={{
                    // Dituliskan jam menit
                    fileName: `riwayat transaksi ${wartelName} ${filenameDate()}`,
                  }}
                  {...props}
                  startIcon={<i className="bx bx-download bx-md" />}
                  label=""
                />
              </Stack>
            </Box>
          ),
        }}
        loading={loading || !calls}
        rows={formatCalls(calls)}
        columns={columns}
      />
    </Box>
  );
};

const filenameDate = () => {
  // Should return current date as a string in the format YYYY-MM-DD-HH-mm-ss with the timezone

  // append zeror if only one digit
  const addZero = (num: number) => (num < 10 ? `0${num}` : num);

  // get current date
  const date = new Date();
  const year = date.getFullYear();
  const month = addZero(date.getMonth() + 1);
  const day = addZero(date.getDate());
  const hours = addZero(date.getHours());
  const minutes = addZero(date.getMinutes());
  const seconds = addZero(date.getSeconds());

  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
};
